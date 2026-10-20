const cron = require('node-cron');
const Cattle = require('../models/Cattle');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');
const { addUnknownCattle } = require('../utils/mlService');

const MAX_RETRIES = 4; // 4 retries × 30 min = 2 hours

/**
 * Retry ML gallery registration for cattle that previously failed.
 * Runs every 30 minutes.
 *
 * Flow:
 *  1. Find cattle with mlRegistration.status='in_progress' and nextRetryAt <= now
 *  2. Try addUnknownCattle() for each
 *  3. Success → status='registered'
 *  4. Fail & retryCount < MAX_RETRIES → increment count, schedule next retry
 *  5. Fail & retryCount >= MAX_RETRIES → status='manual_pending', notify M-Admin
 */
const runMLCattleRetryJob = async () => {
  console.log('[MLRetryJob] Running cattle ML gallery registration retry...');
  try {
    const now = new Date();
    const pendingCattle = await Cattle.find({
      'mlRegistration.status': 'in_progress',
      'mlRegistration.nextRetryAt': { $lte: now }
    }).populate('owner', 'firstName lastName address');

    if (pendingCattle.length === 0) {
      console.log('[MLRetryJob] No cattle pending ML retry.');
      return;
    }

    console.log(`[MLRetryJob] Found ${pendingCattle.length} cattle to retry ML registration`);

    for (const cattle of pendingCattle) {
      const muzzleImage = cattle.images?.muzzle?.[0];
      if (!muzzleImage || !muzzleImage.path) {
        console.warn(`[MLRetryJob] No muzzle image for cattle ${cattle.cattleId} – skipping`);
        continue;
      }

      const retryCount = cattle.mlRegistration.retryCount || 0;
      const mlResult = await addUnknownCattle(muzzleImage.path, cattle.cattleId);

      if (mlResult && mlResult.status === 'added') {
        // Success → auto-approve cattle
        await Cattle.findByIdAndUpdate(cattle._id, {
          'mlRegistration.status': 'registered',
          'mlRegistration.registeredAt': new Date(),
          'mlRegistration.lastRetryAt': new Date(),
          $unset: { 'mlRegistration.nextRetryAt': '' },
          status: 'active',
          'verification.status': 'approved',
          'verification.reviewedAt': new Date(),
          'verification.notes': 'Auto-approved by AI system'
        });
        await Notification.create({
          recipient: cattle.owner?._id,
          recipientModel: 'User',
          type: 'cattle_approved',
          title: 'Cattle Registration Approved',
          message: `Your cattle ${cattle.cattleId} has been successfully registered and approved by the AI system.`,
          relatedCattle: cattle._id,
          priority: 'medium'
        });
        console.log(`[MLRetryJob] Successfully registered ${cattle.cattleId} in ML gallery (retry #${retryCount}) – auto-approved`);

      } else if (retryCount + 1 >= MAX_RETRIES) {
        // Exhausted retries → escalate to M-Admin
        await Cattle.findByIdAndUpdate(cattle._id, {
          'mlRegistration.status': 'manual_pending',
          'mlRegistration.retryCount': retryCount + 1,
          'mlRegistration.lastRetryAt': new Date(),
          $unset: { 'mlRegistration.nextRetryAt': '' }
        });

        // Find all M-Admins (national scope, no region filter)
        const mAdmins = await Admin.find({
          role: 'm_admin',
          isActive: true,
          isApproved: true
        });

        for (const mAdmin of mAdmins) {
          await Notification.create({
            recipient: mAdmin._id,
            recipientModel: 'Admin',
            type: 'ml_registration_failed',
            title: 'ML Registration Failed – Manual Action Required',
            message: `AI gallery registration failed for cattle ${cattle.cattleId} after 2 hours. Farmer: ${cattle.owner?.firstName} ${cattle.owner?.lastName}. Please add to system manually.`,
            relatedCattle: cattle._id,
            relatedUser: cattle.owner?._id,
            priority: 'urgent',
            actionUrl: `/m-admin/ml-failed-cattle/${cattle._id}`,
            actionText: 'Register Manually'
          });
        }

        // Notify owner: still processing
        await Notification.create({
          recipient: cattle.owner?._id,
          recipientModel: 'User',
          type: 'cattle_registered',
          title: 'Registration In Progress',
          message: `Your cattle ${cattle.cattleId} is still being processed by our team. We'll update you once it's complete.`,
          relatedCattle: cattle._id,
          priority: 'medium'
        });

        console.log(`[MLRetryJob] Escalated ${cattle.cattleId} to M-Admin after ${retryCount + 1} failed ML attempts`);

      } else {
        // Schedule next retry
        const nextRetry = new Date(Date.now() + 30 * 60 * 1000);
        await Cattle.findByIdAndUpdate(cattle._id, {
          'mlRegistration.retryCount': retryCount + 1,
          'mlRegistration.lastRetryAt': new Date(),
          'mlRegistration.nextRetryAt': nextRetry
        });
        console.log(`[MLRetryJob] Retry #${retryCount + 1} failed for ${cattle.cattleId}. Next retry: ${nextRetry.toISOString()}`);
      }
    }
  } catch (err) {
    console.error('[MLRetryJob] Unexpected error in cattle retry job:', err.message);
  }
};

/**
 * Retry ML identification for pending identification requests.
 * Runs every 30 minutes.
 *
 * Flow:
 *  1. Find requests with status='pending', mlRetry.nextRetryAt <= now, no escalatedAt
 *  2. Try ML model
 *  3. Success → auto-complete
 *  4. Fail & count < MAX_RETRIES → schedule next retry
 *  5. Fail & count >= MAX_RETRIES → escalate to M-Admin
 */
const runMLIdentificationRetryJob = async () => {
  console.log('[MLRetryJob] Running identification ML retry...');
  try {
    const IdentificationRequest = require('../models/IdentificationRequest');
    const User = require('../models/User');
    const { processWithMLModel, escalateIdentificationToMAdmin } = require('../controllers/identificationController');

    const now = new Date();
    const pendingRequests = await IdentificationRequest.find({
      status: 'pending',
      'mlRetry.nextRetryAt': { $lte: now },
      'mlRetry.escalatedAt': { $exists: false }
    }).populate('user');

    if (pendingRequests.length === 0) {
      console.log('[MLRetryJob] No identification requests pending ML retry.');
      return;
    }

    console.log(`[MLRetryJob] Found ${pendingRequests.length} identification requests to retry`);

    for (const request of pendingRequests) {
      const retryCount = request.mlRetry?.count || 0;

      if (retryCount >= MAX_RETRIES) {
        // Escalate to M-Admin
        if (request.user) {
          await escalateIdentificationToMAdmin(request, request.user);
        }
        continue;
      }

      // Try ML again
      const mAdmins = []; // mAdmins not needed for retry attempt – escalation handles it
      await processWithMLModel(request, mAdmins, request.user);
    }
  } catch (err) {
    console.error('[MLRetryJob] Unexpected error in identification retry job:', err.message);
  }
};

/**
 * Start both ML retry cron jobs.
 * Called from server.js after DB connection is established.
 */
const startMLRetryJobs = () => {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', runMLCattleRetryJob, {
    timezone: 'Asia/Kolkata'
  });

  cron.schedule('*/30 * * * *', runMLIdentificationRetryJob, {
    timezone: 'Asia/Kolkata'
  });

  console.log('[MLRetryJob] ML retry jobs scheduled (every 30 minutes)');
};

module.exports = { startMLRetryJobs, runMLCattleRetryJob, runMLIdentificationRetryJob };
