const IdentificationRequest = require('../models/IdentificationRequest');
const Cattle = require('../models/Cattle');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const fs = require('fs').promises;
const path = require('path');
const { callMLModel } = require('../utils/mlService');

/**
 * Identification Request Controller
 * Handles user cattle identification requests
 *
 * Updated ML Flow:
 * 1. User submits 4 images → create IdentificationRequest (status: pending)
 * 2. Background: call ML /predict (30s timeout)
 *    a. ML succeeds → auto-complete request, notify user
 *    b. ML fails/timeout → schedule retry (every 30 min, up to 2 hours / 4 retries)
 *       - Retry job picks up requests with status=pending and mlRetry.nextRetryAt <= now
 *    c. After 4 retries (2 hours) → escalate to M-Admin, notify M-Admin
 * 3. If M-Admin processes manually → notify user with result
 */

// ========== ML MODEL BACKGROUND PROCESSING ==========

/**
 * Try ML model for an identification request.
 * On success → auto-complete.
 * On failure → record retry state; actual retries handled by mlRetryJob.
 *
 * @param {object} identificationRequest - Mongoose doc
 * @param {Array}  mAdmins               - M-Admin docs for this region
 * @param {object} user                  - User doc
 */
const processWithMLModel = async (identificationRequest, mAdmins, user) => {
  console.log(`[ML Identify] Attempting ML for request ${identificationRequest.requestId}`);

  const mlResult = await callMLModel(identificationRequest);

  if (mlResult && mlResult.success !== false) {
    // ── ML responded successfully ─────────────────────────────────────────
    console.log(`[ML Identify] Got result for ${identificationRequest.requestId}:`, mlResult);

    // Re-fetch to ensure it hasn't been picked up by M_Admin already
    const request = await IdentificationRequest.findById(identificationRequest._id);
    if (!request || request.status !== 'pending') {
      console.log(`[ML Identify] Request ${identificationRequest.requestId} already processed – skip`);
      return;
    }

    request.status = 'processing';
    request.processing.startedAt = new Date();
    await request.save();

    const found = mlResult.found === true;
    let cattle = null;

    if (found && mlResult.cattleId) {
      // ML returns the cattleId string (e.g. C123456789), look up by that
      cattle = await Cattle.findOne({ cattleId: mlResult.cattleId });
      if (!cattle) {
        console.warn(`[ML Identify] ML returned unknown cattleId "${mlResult.cattleId}" – treating as not found`);
      }
    }

    await request.completeWithResult({
      found: found && cattle !== null,
      cattle: cattle ? cattle._id : null,
      cattleId: cattle ? cattle.cattleId : null,
      confidence: mlResult.confidence || null,
      message: mlResult.message || (found && cattle ? 'Cattle identified by AI system' : 'No match found by AI system')
    });

    if (cattle) {
      cattle.identificationHistory = cattle.identificationHistory || [];
      cattle.identificationHistory.push({
        identifiedAt: new Date(),
        identifiedBy: null,
        method: 'image_scan'
      });
      await cattle.save();
    }

    const isFound = found && cattle !== null;
    await Notification.create({
      recipient: identificationRequest.user,
      recipientModel: 'User',
      type: isFound ? 'identification_found' : 'identification_not_found',
      title: isFound ? 'Cattle Identified!' : 'Identification Complete',
      message: isFound
        ? `Your cattle has been identified as ${cattle.cattleId} by our AI system.`
        : 'Our AI system could not find a match for your identification request.',
      priority: 'high',
      actionUrl: isFound ? `/cattle/${cattle._id}` : null,
      actionText: isFound ? 'View Cattle' : null
    });

    console.log(`[ML Identify] Auto-completed ${identificationRequest.requestId} – found: ${isFound}`);

  } else {
    // ── ML timed out or failed – schedule retry ───────────────────────────
    console.log(`[ML Identify] ML failed/timed out for ${identificationRequest.requestId} – scheduling retry`);

    const currentCount = identificationRequest.mlRetry?.count || 0;
    const retryAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await IdentificationRequest.findByIdAndUpdate(identificationRequest._id, {
      $inc: { 'mlRetry.count': 1 },
      'mlRetry.lastRetryAt': new Date(),
      'mlRetry.nextRetryAt': retryAt
    });

    // Only notify user on the first ML failure (not every retry)
    if (currentCount === 0) {
      await Notification.create({
        recipient: identificationRequest.user,
        recipientModel: 'User',
        type: 'identification_processing_started',
        title: 'Identification In Progress',
        message: 'Your identification request is being processed. We\'ll notify you once it\'s complete (up to 2 hours).',
        priority: 'medium'
      });
    }

    console.log(`[ML Identify] Retry #${currentCount + 1} scheduled for ${identificationRequest.requestId} at ${retryAt.toISOString()}`);
  }
};

/**
 * Escalate an identification request to M-Admin after all ML retries exhausted.
 * Called by the retry job.
 *
 * @param {object} request - IdentificationRequest Mongoose doc
 * @param {object} user    - User doc
 */
const escalateIdentificationToMAdmin = async (request, user) => {
  const mAdmins = await Admin.find({
    role: 'm_admin',
    'assignedRegion.state': user.address.state,
    isActive: true,
    isApproved: true
  });

  await IdentificationRequest.findByIdAndUpdate(request._id, {
    'mlRetry.escalatedAt': new Date()
  });

  for (const mAdmin of mAdmins) {
    await Notification.create({
      recipient: mAdmin._id,
      recipientModel: 'Admin',
      type: 'ml_identification_failed',
      title: 'AI Failed – Manual Review Required',
      message: `AI could not identify the cattle from ${user.firstName} ${user.lastName} after 2 hours. Please identify manually.`,
      relatedUser: user._id,
      priority: 'urgent',
      actionUrl: `/m-admin/identification/${request._id}`,
      actionText: 'Identify Manually'
    });
  }

  // Notify user: manual review underway
  await Notification.create({
    recipient: request.user,
    recipientModel: 'User',
    type: 'identification_processing_started',
    title: 'Verification In Progress',
    message: 'Our AI could not complete verification. An expert is now reviewing your request manually.',
    priority: 'medium'
  });

  console.log(`[ML Identify] Escalated ${request.requestId} to M-Admin for manual review`);
};

// ========== USER: CATTLE IDENTIFICATION REQUESTS ==========

/**
 * @desc    Create identification request (User captures photo to identify cattle)
 * @route   POST /api/v1/cattle/identify
 * @access  Private (User only)
 */
const createIdentificationRequest = asyncHandler(async (req, res) => {
  const { latitude, longitude, address, deviceInfo } = req.body;

  // Check if all 4 images are uploaded (validated in middleware, but double-check)
  if (!req.files || !req.files.front || !req.files.back || !req.files.right || !req.files.left) {
    return res.status(400).json({
      success: false,
      message: 'Please upload all 4 images for identification (front, back, right, left)'
    });
  }

  // Create identification request with 4 images
  const identificationRequest = await IdentificationRequest.create({
    user: req.user._id,
    images: {
      front: {
        filename: req.files.front[0].filename,
        path: req.files.front[0].path,
        size: req.files.front[0].size,
        mimetype: req.files.front[0].mimetype
      },
      back: {
        filename: req.files.back[0].filename,
        path: req.files.back[0].path,
        size: req.files.back[0].size,
        mimetype: req.files.back[0].mimetype
      },
      right: {
        filename: req.files.right[0].filename,
        path: req.files.right[0].path,
        size: req.files.right[0].size,
        mimetype: req.files.right[0].mimetype
      },
      left: {
        filename: req.files.left[0].filename,
        path: req.files.left[0].path,
        size: req.files.left[0].size,
        mimetype: req.files.left[0].mimetype
      },
      uploadedAt: new Date()
    },
    location: latitude && longitude ? {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || ''
    } : undefined,
    deviceInfo: deviceInfo || req.get('user-agent'),
    status: 'pending'
  });

  // Get user details
  const user = await User.findById(req.user._id);

  // Find M_Admins in the user's region
  const mAdmins = await Admin.find({
    role: 'm_admin',
    'assignedRegion.state': user.address.state,
    isActive: true,
    isApproved: true
  });

  // Notify M_Admins
  for (const mAdmin of mAdmins) {
    await Notification.create({
      recipient: mAdmin._id,
      recipientModel: 'Admin',
      type: 'identification_request_created',
      title: 'New Cattle Identification Request',
      message: `${user.firstName} ${user.lastName} has submitted a cattle identification request.`,
      relatedUser: user._id,
      priority: 'medium',
      actionUrl: `/m-admin/identification/${identificationRequest._id}`,
      actionText: 'Identify Cattle'
    });

    // Update M_Admin statistics
    if (mAdmin.statistics) {
      mAdmin.statistics.identificationRequestsPending = 
        (mAdmin.statistics.identificationRequestsPending || 0) + 1;
      await mAdmin.save();
    }
  }

  // Set initial ML retry state (nextRetryAt = now so job picks it up immediately)
  identificationRequest.mlRetry = { count: 0, nextRetryAt: new Date() };
  await identificationRequest.save();

  // Populate and return
  await identificationRequest.populate('user', 'firstName lastName mobileNumber email');

  res.status(201).json({
    success: true,
    message: 'Identification request submitted. Verification is in progress.',
    data: {
      identificationRequest,
      estimatedTime: '2 hours',
      requestId: identificationRequest.requestId
    }
  });

  // Fire-and-forget: run first ML attempt in background
  setImmediate(() => {
    processWithMLModel(identificationRequest, mAdmins, user).catch((err) => {
      console.error('[ML Identify] Unhandled error in background ML processing:', err.message);
    });
  });
});

/**
 * @desc    Get user's identification requests
 * @route   GET /api/v1/cattle/identify/my-requests
 * @access  Private (User only)
 */
const getMyIdentificationRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  let query = { user: req.user._id };

  // Filter by status if provided
  if (status && ['pending', 'processing', 'completed', 'failed', 'cancelled'].includes(status)) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const requests = await IdentificationRequest.find(query)
    .populate('result.cattle', 'cattleId breed age images.face')
    .populate('processing.processedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await IdentificationRequest.countDocuments(query);

  // Format image URLs
  const formattedRequests = requests.map(req => {
    const reqObj = req.toObject();
    if (reqObj.images) {
      if (reqObj.images.front && reqObj.images.front.filename) {
        reqObj.images.front.url = `/uploads/identification/${reqObj.images.front.filename}`;
      }
      if (reqObj.images.back && reqObj.images.back.filename) {
        reqObj.images.back.url = `/uploads/identification/${reqObj.images.back.filename}`;
      }
      if (reqObj.images.right && reqObj.images.right.filename) {
        reqObj.images.right.url = `/uploads/identification/${reqObj.images.right.filename}`;
      }
      if (reqObj.images.left && reqObj.images.left.filename) {
        reqObj.images.left.url = `/uploads/identification/${reqObj.images.left.filename}`;
      }
    }
    return reqObj;
  });

  res.status(200).json({
    success: true,
    data: {
      requests: formattedRequests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    }
  });
});

/**
 * @desc    Get single identification request by ID
 * @route   GET /api/v1/cattle/identify/:id
 * @access  Private (User only - own requests)
 */
const getIdentificationRequestById = asyncHandler(async (req, res) => {
  const request = await IdentificationRequest.findOne({
    _id: req.params.id,
    user: req.user._id
  })
    .populate('user', 'firstName lastName mobileNumber email address')
    .populate('result.cattle', 'cattleId breed age color type images')
    .populate('processing.processedBy', 'firstName lastName role');

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Identification request not found'
    });
  }

  // Format image URLs
  const requestObj = request.toObject();
  if (requestObj.images) {
    if (requestObj.images.front && requestObj.images.front.filename) {
      requestObj.images.front.url = `/uploads/identification/${requestObj.images.front.filename}`;
    }
    if (requestObj.images.back && requestObj.images.back.filename) {
      requestObj.images.back.url = `/uploads/identification/${requestObj.images.back.filename}`;
    }
    if (requestObj.images.right && requestObj.images.right.filename) {
      requestObj.images.right.url = `/uploads/identification/${requestObj.images.right.filename}`;
    }
    if (requestObj.images.left && requestObj.images.left.filename) {
      requestObj.images.left.url = `/uploads/identification/${requestObj.images.left.filename}`;
    }
  }

  res.status(200).json({
    success: true,
    data: requestObj
  });
});

/**
 * @desc    Cancel identification request
 * @route   PUT /api/v1/cattle/identify/:id/cancel
 * @access  Private (User only - own requests)
 */
const cancelIdentificationRequest = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const request = await IdentificationRequest.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Identification request not found'
    });
  }

  if (request.status === 'completed' || request.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel a ${request.status} request`
    });
  }

  await request.cancel(req.user._id, reason || 'Cancelled by user');

  // Decrement M_Admin pending count so stats don't drift
  const cancelUser = await User.findById(req.user._id).select('address');
  if (cancelUser) {
    const affectedMAdmins = await Admin.find({
      role: 'm_admin',
      'assignedRegion.state': cancelUser.address.state,
      isActive: true,
      isApproved: true
    });
    for (const mAdmin of affectedMAdmins) {
      if (mAdmin.statistics) {
        mAdmin.statistics.identificationRequestsPending =
          Math.max(0, (mAdmin.statistics.identificationRequestsPending || 0) - 1);
        await mAdmin.save();
      }
    }
  }

  res.status(200).json({
    success: true,
    message: 'Identification request cancelled successfully',
    data: request
  });
});

// ========== M_ADMIN: PROCESS IDENTIFICATION REQUESTS ==========

/**
 * @desc    Get pending identification requests for M_Admin
 * @route   GET /api/v1/admin/m-admin/identification/pending
 * @access  Private (M_Admin only)
 */
const getPendingIdentificationRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  // Build query - M_Admin sees only their region
  let userIds = [];
  if (req.user.role === 'm_admin') {
    const users = await User.find({
      'address.state': req.user.assignedRegion.state
    }).select('_id');
    userIds = users.map(u => u._id);
  }

  const query = {
    status: { $in: ['pending', 'processing'] }
  };

  if (userIds.length > 0) {
    query.user = { $in: userIds };
  }

  const skip = (page - 1) * limit;

  const requests = await IdentificationRequest.find(query)
    .populate('user', 'firstName lastName mobileNumber email address')
    .populate('processing.processedBy', 'firstName lastName')
    .sort({ createdAt: 1 }) // Oldest first
    .limit(parseInt(limit))
    .skip(skip);

  const total = await IdentificationRequest.countDocuments(query);

  // Format image URLs
  const formattedRequests = requests.map(req => {
    const reqObj = req.toObject();
    if (reqObj.images) {
      if (reqObj.images.front && reqObj.images.front.filename) {
        reqObj.images.front.url = `/uploads/identification/${reqObj.images.front.filename}`;
      }
      if (reqObj.images.back && reqObj.images.back.filename) {
        reqObj.images.back.url = `/uploads/identification/${reqObj.images.back.filename}`;
      }
      if (reqObj.images.right && reqObj.images.right.filename) {
        reqObj.images.right.url = `/uploads/identification/${reqObj.images.right.filename}`;
      }
      if (reqObj.images.left && reqObj.images.left.filename) {
        reqObj.images.left.url = `/uploads/identification/${reqObj.images.left.filename}`;
      }
    }
    return reqObj;
  });

  res.status(200).json({
    success: true,
    data: {
      requests: formattedRequests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    }
  });
});

/**
 * @desc    Get identification request details for M_Admin processing
 * @route   GET /api/v1/admin/m-admin/identification/:id
 * @access  Private (M_Admin only)
 */
const getIdentificationRequestForAdmin = asyncHandler(async (req, res) => {
  const request = await IdentificationRequest.findById(req.params.id)
    .populate('user', 'firstName lastName mobileNumber email address occupation')
    .populate('result.cattle')
    .populate('processing.processedBy', 'firstName lastName role');

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Identification request not found'
    });
  }

  // Format image URLs
  const requestObj = request.toObject();
  if (requestObj.images) {
    if (requestObj.images.front && requestObj.images.front.filename) {
      requestObj.images.front.url = `/uploads/identification/${requestObj.images.front.filename}`;
    }
    if (requestObj.images.back && requestObj.images.back.filename) {
      requestObj.images.back.url = `/uploads/identification/${requestObj.images.back.filename}`;
    }
    if (requestObj.images.right && requestObj.images.right.filename) {
      requestObj.images.right.url = `/uploads/identification/${requestObj.images.right.filename}`;
    }
    if (requestObj.images.left && requestObj.images.left.filename) {
      requestObj.images.left.url = `/uploads/identification/${requestObj.images.left.filename}`;
    }
  }

  res.status(200).json({
    success: true,
    data: requestObj
  });
});

/**
 * @desc    Get all cattle of the farmer who submitted the identification request
 * @route   GET /api/v1/admin/m-admin/identification/:id/farmer-cattle
 * @access  Private (M_Admin only)
 * @note    This endpoint is specifically for M_Admin to match identification images
 *          against ONLY the requesting farmer's cattle (not entire database)
 */
const getFarmerCattleForIdentification = asyncHandler(async (req, res) => {
  const request = await IdentificationRequest.findById(req.params.id)
    .populate('user');

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Identification request not found'
    });
  }

  // Get all cattle owned by this farmer (active and transit status)
  const farmerCattle = await Cattle.find({
    owner: request.user._id,
    status: { $in: ['active', 'transit'] }
  })
    .select('cattleId breed age type color images status createdAt')
    .sort({ createdAt: -1 });

  // Format image URLs for each cattle
  const formattedCattle = farmerCattle.map(cattle => {
    const cattleObj = cattle.toObject();

    // Format all cattle images
    if (cattleObj.images) {
      ['muzzle', 'face', 'left', 'right', 'fullBodyLeft', 'fullBodyRight'].forEach(category => {
        if (cattleObj.images[category] && Array.isArray(cattleObj.images[category])) {
          cattleObj.images[category] = cattleObj.images[category].map(img => ({
            ...img,
            url: `/uploads/cattle/${category}/${img.filename}`
          }));
        }
      });
    }

    return cattleObj;
  });

  res.status(200).json({
    success: true,
    data: {
      farmer: {
        id: request.user._id,
        name: `${request.user.firstName} ${request.user.lastName}`,
        mobileNumber: request.user.mobileNumber
      },
      totalCattle: formattedCattle.length,
      cattle: formattedCattle
    }
  });
});

/**
 * @desc    Start processing identification request
 * @route   PUT /api/v1/admin/m-admin/identification/:id/start
 * @access  Private (M_Admin only)
 */
const startProcessingRequest = asyncHandler(async (req, res) => {
  const request = await IdentificationRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Identification request not found'
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Cannot start processing a ${request.status} request`
    });
  }

  await request.startProcessing(req.user._id);

  // Notify user that processing has started
  await Notification.create({
    recipient: request.user,
    recipientModel: 'User',
    type: 'identification_processing_started',
    title: 'Identification In Progress',
    message: `Your cattle identification request ${request.requestId} is now being processed.`,
    priority: 'normal'
  });

  res.status(200).json({
    success: true,
    message: 'Started processing identification request',
    data: request
  });
});

/**
 * @desc    Complete identification request with result
 * @route   PUT /api/v1/admin/m-admin/identification/:id/complete
 * @access  Private (M_Admin only)
 */
const completeIdentificationRequest = asyncHandler(async (req, res) => {
  const { found, cattleId, message, adminNotes, confidence } = req.body;

  if (found === undefined || found === null) {
    return res.status(400).json({
      success: false,
      message: 'Please specify if cattle was found (true/false)'
    });
  }

  const request = await IdentificationRequest.findById(req.params.id)
    .populate('user');

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Identification request not found'
    });
  }

  if (request.status !== 'pending' && request.status !== 'processing') {
    return res.status(400).json({
      success: false,
      message: `Cannot complete a ${request.status} request`
    });
  }

  // If cattle found, cattleId must be provided and valid
  let cattle = null;
  if (found) {
    if (!cattleId) {
      return res.status(400).json({
        success: false,
        message: 'cattleId is required when found is true'
      });
    }
    cattle = await Cattle.findOne({ _id: cattleId });
    if (!cattle) {
      return res.status(404).json({
        success: false,
        message: 'Cattle not found with provided ID'
      });
    }
  }

  // Complete the request with result
  await request.completeWithResult({
    found: found,
    cattle: cattle?._id,
    cattleId: cattle?.cattleId,
    confidence: confidence || null,
    message: message || (found ? 'Cattle identified successfully' : 'No match found in database')
  });

  // Update admin notes if provided
  if (adminNotes) {
    request.adminNotes = adminNotes;
    await request.save();
  }

  // Update M_Admin statistics
  const mAdmin = await Admin.findById(req.user._id);
  if (mAdmin && mAdmin.statistics) {
    mAdmin.statistics.identificationRequestsPending = 
      Math.max(0, (mAdmin.statistics.identificationRequestsPending || 0) - 1);
    mAdmin.statistics.identificationRequestsCompleted = 
      (mAdmin.statistics.identificationRequestsCompleted || 0) + 1;
    await mAdmin.save();
  }

  // Add to cattle's identification history if found
  if (cattle) {
    cattle.identificationHistory = cattle.identificationHistory || [];
    cattle.identificationHistory.push({
      identifiedAt: new Date(),
      identifiedBy: req.user._id,
      method: 'image_scan'
    });
    await cattle.save();
  }

  // Notify user
  const notificationTitle = found ? 'Cattle Identified!' : 'Identification Complete';
  const notificationMessage = found && cattle
    ? `Your cattle has been identified as ${cattle.cattleId}. Processing completed in ${request.processing.timeTaken || 0} seconds.`
    : `No match found for your identification request. ${message || ''}`;

  await Notification.create({
    recipient: request.user._id,
    recipientModel: 'User',
    type: found ? 'identification_found' : 'identification_not_found',
    title: notificationTitle,
    message: notificationMessage,
    priority: 'high',
    actionUrl: found ? `/cattle/${cattle._id}` : null,
    actionText: found ? 'View Cattle' : null
  });

  await request.populate('result.cattle', 'cattleId breed age images.face');

  res.status(200).json({
    success: true,
    message: 'Identification request completed successfully',
    data: request
  });
});

/**
 * @desc    Mark identification request as failed
 * @route   PUT /api/v1/admin/m-admin/identification/:id/fail
 * @access  Private (M_Admin only)
 */
const failIdentificationRequest = asyncHandler(async (req, res) => {
  const { message, reason } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a failure message'
    });
  }

  const request = await IdentificationRequest.findById(req.params.id)
    .populate('user');

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Identification request not found'
    });
  }

  if (request.status === 'completed' || request.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: `Cannot fail a ${request.status} request`
    });
  }

  await request.markAsFailed(message);
  
  if (reason) {
    request.adminNotes = reason;
    await request.save();
  }

  // Update M_Admin statistics
  const mAdmin = await Admin.findById(req.user._id);
  if (mAdmin && mAdmin.statistics) {
    mAdmin.statistics.identificationRequestsPending = 
      Math.max(0, (mAdmin.statistics.identificationRequestsPending || 0) - 1);
    await mAdmin.save();
  }

  // Notify user
  await Notification.create({
    recipient: request.user._id,
    recipientModel: 'User',
    type: 'identification_failed',
    title: 'Identification Failed',
    message: `Your identification request failed: ${message}`,
    priority: 'high'
  });

  res.status(200).json({
    success: true,
    message: 'Identification request marked as failed',
    data: request
  });
});

// ========== STATISTICS ==========

/**
 * @desc    Get identification statistics
 * @route   GET /api/v1/cattle/identify/statistics
 * @access  Private (User can see their stats, Admin can see all)
 */
const getIdentificationStatistics = asyncHandler(async (req, res) => {
  let query = {};

  // Users see only their statistics
  if (req.userType === 'user') {
    query.user = req.user._id;
  }
  // M_Admin sees their region
  else if (req.userType === 'admin' && req.user.role === 'm_admin') {
    const users = await User.find({
      'address.state': req.user.assignedRegion.state
    }).select('_id');
    const userIds = users.map(u => u._id);
    query.user = { $in: userIds };
  }

  const stats = {
    total: await IdentificationRequest.countDocuments(query),
    pending: await IdentificationRequest.countDocuments({ ...query, status: 'pending' }),
    processing: await IdentificationRequest.countDocuments({ ...query, status: 'processing' }),
    completed: await IdentificationRequest.countDocuments({ ...query, status: 'completed' }),
    failed: await IdentificationRequest.countDocuments({ ...query, status: 'failed' }),
    cancelled: await IdentificationRequest.countDocuments({ ...query, status: 'cancelled' }),
    found: await IdentificationRequest.countDocuments({ ...query, 'result.found': true }),
    notFound: await IdentificationRequest.countDocuments({ 
      ...query, 
      status: 'completed',
      'result.found': false 
    })
  };

  // Calculate average processing time for completed requests
  const completedRequests = await IdentificationRequest.find({
    ...query,
    status: 'completed',
    'processing.timeTaken': { $exists: true }
  }).select('processing.timeTaken');

  if (completedRequests.length > 0) {
    const totalTime = completedRequests.reduce((sum, req) => sum + req.processing.timeTaken, 0);
    stats.averageProcessingTime = Math.floor(totalTime / completedRequests.length);
  } else {
    stats.averageProcessingTime = 0;
  }

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Get identification history (completed/failed)
 * @route   GET /api/v1/admin/m-admin/identification-history
 * @access  Private (M_Admin only)
 */
const getIdentificationHistory = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;

  const query = {
    status: { $in: ['completed', 'failed'] }
  };

  // Filter by status if provided
  if (status && ['completed', 'failed'].includes(status)) {
    query.status = status;
  }

  // Search by requestId
  if (search) {
    query.requestId = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [requests, total] = await Promise.all([
    IdentificationRequest.find(query)
      .populate('user', 'firstName lastName mobileNumber email address')
      .populate('processing.processedBy', 'firstName lastName role')
      .populate('result.cattle', 'cattleId breed age images')
      .sort({ 'processing.completedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    IdentificationRequest.countDocuments(query)
  ]);

  // Format image URLs and field names to match frontend
  const formattedRequests = requests.map(req => {
    const reqObj = req.toObject();

    // Format identification request images
    if (reqObj.images) {
      if (reqObj.images.front && reqObj.images.front.filename) {
        reqObj.images.front.url = `/uploads/identification/${reqObj.images.front.filename}`;
      }
      if (reqObj.images.back && reqObj.images.back.filename) {
        reqObj.images.back.url = `/uploads/identification/${reqObj.images.back.filename}`;
      }
      if (reqObj.images.right && reqObj.images.right.filename) {
        reqObj.images.right.url = `/uploads/identification/${reqObj.images.right.filename}`;
      }
      if (reqObj.images.left && reqObj.images.left.filename) {
        reqObj.images.left.url = `/uploads/identification/${reqObj.images.left.filename}`;
      }
    }

    // Add frontend-friendly field names
    reqObj.farmer = reqObj.user; // Frontend expects 'farmer'
    reqObj.processedBy = reqObj.processing?.processedBy;
    reqObj.completedAt = reqObj.processing?.completedAt;
    reqObj.submittedAt = reqObj.createdAt;

    // Determine result type from schema data
    if (reqObj.status === 'completed') {
      if (reqObj.result?.found) {
        reqObj.result = 'found';
      } else {
        reqObj.result = 'not_found';
      }
    } else if (reqObj.status === 'failed') {
      reqObj.result = 'fail';
    }

    // Add matched cattle at root level for frontend
    if (req.result?.cattle) {
      reqObj.matchedCattle = req.result.cattle.toObject ? req.result.cattle.toObject() : req.result.cattle;

      // Format matched cattle images
      if (reqObj.matchedCattle.images?.front && reqObj.matchedCattle.images.front[0]) {
        reqObj.matchedCattle.images.front.url = `/uploads/cattle/front/${reqObj.matchedCattle.images.front[0].filename}`;
      }
      if (reqObj.matchedCattle.images?.right && reqObj.matchedCattle.images.right[0]) {
        reqObj.matchedCattle.images.right.url = `/uploads/cattle/right/${reqObj.matchedCattle.images.right[0].filename}`;
      }
    }

    // Add message at root level
    if (req.result?.message) {
      reqObj.message = req.result.message;
    }

    return reqObj;
  });

  res.status(200).json({
    success: true,
    data: {
      requests: formattedRequests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    }
  });
});

/**
 * @desc    Update identification decision
 * @route   PUT /api/v1/admin/m-admin/identification-history/:id
 * @access  Private (M_Admin only)
 */
const updateIdentificationDecision = asyncHandler(async (req, res) => {
  const { newDecision, matchedCattleId, message } = req.body;
  const decision = newDecision;
  const cattleId = matchedCattleId;

  if (!['found', 'not_found', 'fail'].includes(decision)) {
    return res.status(400).json({
      success: false,
      message: 'Decision must be found, not_found, or fail'
    });
  }

  const request = await IdentificationRequest.findById(req.params.id)
    .populate('user', 'firstName lastName mobileNumber email');

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Identification request not found'
    });
  }

  const oldStatus = request.status;
  const oldResult = request.result;

  if (decision === 'found') {
    if (!cattleId) {
      return res.status(400).json({
        success: false,
        message: 'Cattle ID is required for found decision'
      });
    }

    // Verify cattle exists and belongs to the farmer
    const cattle = await Cattle.findOne({
      _id: cattleId,
      owner: request.user._id
    });

    if (!cattle) {
      return res.status(404).json({
        success: false,
        message: 'Cattle not found or does not belong to this farmer'
      });
    }

    request.status = 'completed';
    request.result.found = true;
    request.result.identifiedCattle = cattleId;
    request.result.message = message || `Successfully identified as cattle ${cattle.cattleId}`;
    request.completedAt = new Date();
    request.processedBy = req.user._id;

    // Notify user
    await Notification.create({
      recipient: request.user._id,
      recipientModel: 'User',
      type: 'identification_found',
      title: 'Cattle Identified',
      message: `Your cattle has been identified as ${cattle.cattleId} after review.`,
      priority: 'high'
    });

  } else if (decision === 'not_found') {
    request.status = 'completed';
    request.result.found = false;
    request.result.identifiedCattle = null;
    request.result.message = message || 'No matching cattle found after review';
    request.completedAt = new Date();
    request.processedBy = req.user._id;

    // Notify user
    await Notification.create({
      recipient: request.user._id,
      recipientModel: 'User',
      type: 'identification_not_found',
      title: 'Cattle Not Found',
      message: 'No matching cattle was found for your identification request after review.',
      priority: 'medium'
    });

  } else {
    // Fail
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Failure message is required'
      });
    }

    request.status = 'failed';
    request.result.message = message;
    request.completedAt = new Date();
    request.processedBy = req.user._id;

    // Notify user
    await Notification.create({
      recipient: request.user._id,
      recipientModel: 'User',
      type: 'identification_failed',
      title: 'Identification Failed',
      message: `Your identification request failed after review. Reason: ${message}`,
      priority: 'high'
    });
  }

  await request.save();

  res.status(200).json({
    success: true,
    message: `Identification decision updated from ${oldStatus} to ${request.status}`,
    data: request
  });
});

module.exports = {
  // User endpoints
  createIdentificationRequest,
  getMyIdentificationRequests,
  getIdentificationRequestById,
  cancelIdentificationRequest,

  // M_Admin endpoints
  getPendingIdentificationRequests,
  getIdentificationRequestForAdmin,
  getFarmerCattleForIdentification,
  startProcessingRequest,
  completeIdentificationRequest,
  failIdentificationRequest,

  // Statistics
  getIdentificationStatistics,

  // History & Modifications
  getIdentificationHistory,
  updateIdentificationDecision,

  // Internal: used by retry job
  processWithMLModel,
  escalateIdentificationToMAdmin
};