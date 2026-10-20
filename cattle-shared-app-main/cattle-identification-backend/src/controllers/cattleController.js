const Cattle = require('../models/Cattle');
const User = require('../models/User');
const TransferRequest = require('../models/TransferRequest');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { deleteCattleImages, formatCattleImages } = require('../utils/imageHelper');
const emailService = require('../utils/emailService');
const { predictCattle, addUnknownCattle, addKnownCattle } = require('../utils/mlService');
/**
 * Cattle Controller
 * Handles cattle registration, management, verification, and transfer
 * 12 images: muzzle:5, face:5, fullBodyLeft:1, fullBodyRight:1
 * Statuses: active, archive, transit
 */

// ========== CATTLE REGISTRATION ==========

/**
 * @desc    Register new cattle
 * @route   POST /api/v1/cattle/register
 * @access  Private (User only)
 */
const registerCattle = asyncHandler(async (req, res) => {
  const { breed, tagNo, medicalHistory, age, type, color } = req.body;

  // Check if images are uploaded (handled by middleware)
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please upload all required images (12 total)'
    });
  }

  // Get user's location for cattle
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // ── ML DUPLICATE CHECK ────────────────────────────────────────────────
  // Use first muzzle image (cattle's "fingerprint") to check if already exists
  const firstMuzzleFile = req.files.muzzle?.[0];
  if (firstMuzzleFile) {
    const mlPredict = await predictCattle(firstMuzzleFile.path);
    if (mlPredict && mlPredict.is_known === true) {
      // ML says this cattle already exists in the registry
      return res.status(409).json({
        success: false,
        message: 'This cattle already exists in the system. Duplicate registration is not allowed.',
        data: {
          matchedCattleId: mlPredict.best_match,
          similarity: mlPredict.max_similarity
        }
      });
    }
    // mlPredict === null means ML is unavailable → we allow registration to proceed
  }
  // ─────────────────────────────────────────────────────────────────────

  // 12 photos; left/right kept empty for schema compatibility
  const images = {
    muzzle: req.files.muzzle?.map(file => ({
      filename: file.filename,
      path: file.path,
      uploadedAt: new Date(),
      size: file.size,
      mimetype: file.mimetype
    })) || [],
    face: req.files.face?.map(file => ({
      filename: file.filename,
      path: file.path,
      uploadedAt: new Date(),
      size: file.size,
      mimetype: file.mimetype
    })) || [],
    left: [],
    right: [],
    fullBodyLeft: req.files.fullBodyLeft?.map(file => ({
      filename: file.filename,
      path: file.path,
      uploadedAt: new Date(),
      size: file.size,
      mimetype: file.mimetype
    })) || [],
    fullBodyRight: req.files.fullBodyRight?.map(file => ({
      filename: file.filename,
      path: file.path,
      uploadedAt: new Date(),
      size: file.size,
      mimetype: file.mimetype
    })) || []
  };

  // Create cattle
  const cattle = await Cattle.create({
    owner: req.user._id,
    breed,
    tagNo,
    medicalHistory,
    age,
    type,
    color,
    images,
    location: {
      state: user.address.state,
      district: user.address.district,
      pinCode: user.address.pinCode
    },
    status: 'transit', // Starts in transit, pending verification
    verification: {
      status: 'pending_verification',
      submittedAt: new Date()
    }
  });

  // Add cattle to user's cattle array
  user.cattle.push(cattle._id);
  await user.save();

  // Create notification for regional admin
  const Admin = require('../models/Admin');
  const regionalAdmins = await Admin.find({
    role: 'regional_admin', // Only regional admins get initial notification
    'assignedRegion.state': user.address.state,
    isActive: true,
    isApproved: true
  });
 // Notify regional admins in this region
  for (const admin of regionalAdmins) {
    await Notification.create({
      recipient: admin._id,
      recipientModel: 'Admin',
      type: 'cattle_registered',
      title: 'New Cattle Registration',
      message: `New cattle (${cattle.cattleId}) registered by ${user.fullName} in ${user.address.district}, ${user.address.state}. Please review within 48 hours.`,
      relatedCattle: cattle._id,
      relatedUser: user._id,
      priority: 'high',
      actionUrl: `/admin/regional/cattle/${cattle._id}/review`,
      actionText: 'Review Now'
    });

    // Update admin statistics
    admin.statistics.pendingVerifications += 1;
    await admin.save();
  }

  res.status(201).json({
    success: true,
    message: 'Cattle registered successfully. Pending admin verification.',
    data: {
      cattle: {
        id: cattle._id,
        cattleId: cattle.cattleId,
        temporaryId: cattle.temporaryId,
        breed: cattle.breed,
        age: cattle.age,
        status: cattle.status,
        verification: cattle.verification,
        mlRegistration: cattle.mlRegistration,
        totalImages: cattle.totalImages
      }
    }
  });

  // ── ML GALLERY REGISTRATION (fire-and-forget) ─────────────────────────
  // After responding to user, try to add cattle to ML gallery
  setImmediate(async () => {
    try {
      const muzzleFile = req.files.muzzle?.[0];
      if (!muzzleFile) return;

      const mlResult = await addUnknownCattle(muzzleFile.path, cattle.cattleId);

      if (mlResult && mlResult.status === 'added') {
        // ML registration successful → auto-approve cattle
        await Cattle.findByIdAndUpdate(cattle._id, {
          'mlRegistration.status': 'registered',
          'mlRegistration.registeredAt': new Date(),
          'mlRegistration.retryCount': 0,
          status: 'active',
          'verification.status': 'approved',
          'verification.reviewedAt': new Date(),
          'verification.notes': 'Auto-approved by AI system'
        });
        // Notify farmer
        await Notification.create({
          recipient: cattle.owner,
          recipientModel: 'User',
          type: 'cattle_approved',
          title: 'Cattle Registration Approved',
          message: `Your cattle ${cattle.cattleId} has been successfully registered and approved by the AI system.`,
          relatedCattle: cattle._id,
          priority: 'medium'
        });
        console.log(`[ML Cattle] Successfully registered ${cattle.cattleId} in ML gallery – auto-approved`);
      } else {
        // ML registration failed – schedule retries (every 30 min, up to 2 hours)
        const nextRetry = new Date(Date.now() + 30 * 60 * 1000);
        await Cattle.findByIdAndUpdate(cattle._id, {
          'mlRegistration.status': 'in_progress',
          'mlRegistration.retryCount': 1,
          'mlRegistration.lastRetryAt': new Date(),
          'mlRegistration.nextRetryAt': nextRetry
        });
        console.log(`[ML Cattle] Failed to register ${cattle.cattleId} in ML gallery. Scheduled retry at ${nextRetry.toISOString()}`);

        // Notify M-Admins immediately so they can act without waiting 2 hours
        const Admin = require('../models/Admin');
        const mAdmins = await Admin.find({ role: 'm_admin', isActive: true, isApproved: true });
        for (const mAdmin of mAdmins) {
          await Notification.create({
            recipient: mAdmin._id,
            recipientModel: 'Admin',
            type: 'ml_registration_failed',
            title: 'ML Registration Failed – Action Required',
            message: `AI gallery registration failed for cattle ${cattle.cattleId}. Farmer: ${user.fullName}. Retrying automatically, but you can also send it to AI or approve manually now.`,
            relatedCattle: cattle._id,
            relatedUser: user._id,
            priority: 'high',
            actionUrl: `/m-admin/ml-failed-cattle/${cattle._id}`,
            actionText: 'Review Now'
          });
        }
      }
    } catch (err) {
      console.error('[ML Cattle] Error during gallery registration:', err.message);
    }
  });
  // ─────────────────────────────────────────────────────────────────────
});

/**
 * @desc    Get all cattle (with filters)
 * @route   GET /api/v1/cattle
 * @access  Private
 */
const getAllCattle = asyncHandler(async (req, res) => {
  const { 
    status, 
    verificationStatus, 
    breed, 
    state, 
    district, 
    search,
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query based on user type
  let query = {};

  if (req.userType === 'user') {
    // Users can only see their own cattle
    query.owner = req.user._id;
  } else if (req.userType === 'admin') {
    // Regional admin can only see cattle from their region
    if (req.user.role === 'regional_admin') {
      query['location.state'] = req.user.assignedRegion.state;
      
      // If specific districts assigned
      if (req.user.assignedRegion.districts && req.user.assignedRegion.districts.length > 0) {
        query['location.district'] = { $in: req.user.assignedRegion.districts };
      }
    }
    // Super admin can see all cattle (no additional query)
  }

  // Apply filters
  if (status) query.status = status;
  if (verificationStatus) query['verification.status'] = verificationStatus;
  if (breed) query.breed = { $regex: breed, $options: 'i' };
  if (state) query['location.state'] = state;
  if (district) query['location.district'] = district;

  // Search by cattleId, tagNo, or breed
  if (search) {
    query.$or = [
      { cattleId: { $regex: search, $options: 'i' } },
      { tagNo: { $regex: search, $options: 'i' } },
      { breed: { $regex: search, $options: 'i' } }
    ];
  }

  // Pagination
  const skip = (page - 1) * limit;

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const cattle = await Cattle.find(query)
    .populate('owner', 'firstName lastName mobileNumber address')
    .populate('verification.verifiedBy', 'firstName lastName role')
    .sort(sort)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Cattle.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      cattle,
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
 * @desc    Get single cattle by ID
 * @route   GET /api/v1/cattle/:id
 * @access  Private
 */
const getCattleById = asyncHandler(async (req, res) => {
  let query = { _id: req.params.id };

  // Apply access control
  if (req.userType === 'user') {
    query.owner = req.user._id;
  } else if (req.userType === 'admin' && req.user.role === 'regional_admin') {
    query['location.state'] = req.user.assignedRegion.state;
  }

  const cattle = await Cattle.findOne(query)
    .populate('owner', 'firstName lastName email mobileNumber address occupation')
    .populate('verification.verifiedBy', 'firstName lastName email role')
    .populate('transferHistory');

  if (!cattle) {
    return res.status(404).json({
      success: false,
      message: 'Cattle not found or you do not have permission to view it'
    });
  }

  // Format images with URLs
  const formattedCattle = cattle.toObject();
  formattedCattle.images = formatCattleImages(cattle.images);

  res.status(200).json({
    success: true,
    data: formattedCattle
  });
});

/**
 * @desc    Search cattle by image (placeholder for future ML integration)
 * @route   POST /api/v1/cattle/search-by-image
 * @access  Private (Admin only)
 */
const searchCattleByImage = asyncHandler(async (req, res) => {
  // This is a placeholder for future ML model integration
  // As per your instruction: no ML model, images go to regional admin for approval

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload an image to search'
    });
  }

  // For now, return message that this feature requires ML model
  res.status(200).json({
    success: true,
    message: 'Image search feature requires ML model integration. Currently, manual verification is performed by regional admins.',
    data: {
      uploadedImage: req.file.filename,
      note: 'This feature will be available after ML model integration'
    }
  });
});

// ========== CATTLE MANAGEMENT (USER) ==========

/**
 * @desc    Archive cattle (move to recycle bin)
 * @route   PUT /api/v1/cattle/:id/archive
 * @access  Private (Owner only)
 */
const archiveCattle = asyncHandler(async (req, res) => {
  const cattle = await Cattle.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!cattle) {
    return res.status(404).json({
      success: false,
      message: 'Cattle not found'
    });
  }

  if (cattle.status === 'archive') {
    return res.status(400).json({
      success: false,
      message: 'Cattle is already archived'
    });
  }

  // Block archive if there is a pending transfer
  const hasPendingTransfer = await TransferRequest.findOne({ cattle: cattle._id, status: 'pending' });
  if (hasPendingTransfer) {
    return res.status(400).json({
      success: false,
      message: 'Cannot archive cattle with a pending transfer request. Cancel the transfer first.'
    });
  }

  await cattle.archive(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Cattle moved to archive',
    data: cattle
  });
});

/**
 * @desc    Restore cattle from archive
 * @route   PUT /api/v1/cattle/:id/restore
 * @access  Private (Owner only)
 */
const restoreCattle = asyncHandler(async (req, res) => {
  const cattle = await Cattle.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!cattle) {
    return res.status(404).json({
      success: false,
      message: 'Cattle not found'
    });
  }

  if (cattle.status !== 'archive') {
    return res.status(400).json({
      success: false,
      message: 'Cattle is not archived'
    });
  }

  await cattle.restore();

  res.status(200).json({
    success: true,
    message: 'Cattle restored successfully',
    data: cattle
  });
});

/**
 * @desc    Delete cattle permanently
 * @route   DELETE /api/v1/cattle/:id
 * @access  Private (Owner only)
 */
const deleteCattle = asyncHandler(async (req, res) => {
  const cattle = await Cattle.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!cattle) {
    return res.status(404).json({
      success: false,
      message: 'Cattle not found'
    });
  }

  // Block delete if there is a pending transfer
  const hasPendingTransfer = await TransferRequest.findOne({ cattle: cattle._id, status: 'pending' });
  if (hasPendingTransfer) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete cattle with a pending transfer request. Cancel the transfer first.'
    });
  }

  // Delete all images
  deleteCattleImages(cattle.images);

  // Remove from user's cattle array
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { cattle: cattle._id }
  });

  // Delete cattle
  await cattle.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Cattle deleted permanently'
  });
});

// ========== CATTLE TRANSFER (SELL FUNCTIONALITY) ==========

/**
 * @desc    Initiate cattle transfer (sell)
 * @route   POST /api/v1/cattle/:id/transfer
 * @access  Private (Owner only)
 */
const initiateCattleTransfer = asyncHandler(async (req, res) => {
  const { toOwnerId, transferType, price, notes } = req.body;

  // Get cattle
  const cattle = await Cattle.findOne({
    _id: req.params.id,
    owner: req.user._id,
    status: 'active' // Can only transfer active cattle
  });

  if (!cattle) {
    return res.status(404).json({
      success: false,
      message: 'Cattle not found or cannot be transferred'
    });
  }

  // Check if new owner exists
  const newOwner = await User.findById(toOwnerId);

  if (!newOwner) {
    return res.status(404).json({
      success: false,
      message: 'New owner not found'
    });
  }

  // Prevent self-transfer
  if (toOwnerId.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot transfer cattle to yourself'
    });
  }

  // Check for existing pending transfer
  const existingTransfer = await TransferRequest.findOne({
    cattle: cattle._id,
    status: 'pending'
  });

  if (existingTransfer) {
    return res.status(400).json({
      success: false,
      message: 'There is already a pending transfer request for this cattle'
    });
  }

  // Create transfer request
  const transferRequest = await TransferRequest.create({
    cattle: cattle._id,
    fromOwner: req.user._id,
    toOwner: toOwnerId,
    transferType: transferType || 'sell',
    transferDetails: {
      price,
      notes,
      transferDate: new Date()
    }
  });

  // Notify new owner
  await Notification.create({
    recipient: newOwner._id,
    recipientModel: 'User',
    type: 'transfer_request_received',
    title: 'New Transfer Request',
    message: `${req.user.fullName} wants to transfer cattle ${cattle.cattleId} (${cattle.breed}) to you.`,
    relatedCattle: cattle._id,
    relatedUser: req.user._id,
    relatedTransfer: transferRequest._id,
    priority: 'high',
    actionUrl: `/transfer-requests/${transferRequest._id}`,
    actionText: 'View Request'
  });

  await transferRequest.populate('cattle fromOwner toOwner');

  res.status(201).json({
    success: true,
    message: 'Transfer request sent successfully',
    data: transferRequest
  });
});

/**
 * @desc    Get cattle transfer history
 * @route   GET /api/v1/cattle/:id/transfer-history
 * @access  Private
 */
const getCattleTransferHistory = asyncHandler(async (req, res) => {
  let query = { _id: req.params.id };

  // Apply access control
  if (req.userType === 'user') {
    query.owner = req.user._id;
  } else if (req.userType === 'admin' && req.user.role === 'regional_admin') {
    query['location.state'] = req.user.assignedRegion.state;
  }

  const cattle = await Cattle.findOne(query)
    .populate({
      path: 'transferHistory',
      populate: [
        { path: 'fromOwner', select: 'firstName lastName mobileNumber' },
        { path: 'toOwner', select: 'firstName lastName mobileNumber' }
      ]
    });

  if (!cattle) {
    return res.status(404).json({
      success: false,
      message: 'Cattle not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      cattleId: cattle.cattleId,
      currentOwner: cattle.owner,
      transferHistory: cattle.transferHistory
    }
  });
});

// ========== CATTLE IMAGES ==========

/**
 * @desc    Get cattle images by category
 * @route   GET /api/v1/cattle/:id/images/:category
 * @access  Private
 */
const getCattleImages = asyncHandler(async (req, res) => {
  const { category } = req.params;

  const validCategories = ['muzzle', 'face', 'left', 'right', 'fullBodyLeft', 'fullBodyRight'];

  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid image category'
    });
  }

  let query = { _id: req.params.id };

  // Apply access control
  if (req.userType === 'user') {
    query.owner = req.user._id;
  } else if (req.userType === 'admin' && req.user.role === 'regional_admin') {
    query['location.state'] = req.user.assignedRegion.state;
  }

  const cattle = await Cattle.findOne(query);

  if (!cattle) {
    return res.status(404).json({
      success: false,
      message: 'Cattle not found'
    });
  }

  const images = cattle.images[category] || [];

  // Format images with URLs
  const formattedImages = images.map(img => ({
    filename: img.filename,
    url: `/uploads/cattle/${category}/${img.filename}`,
    uploadedAt: img.uploadedAt,
    size: img.size,
    mimetype: img.mimetype
  }));

  res.status(200).json({
    success: true,
    data: {
      category,
      count: formattedImages.length,
      images: formattedImages
    }
  });
});

/**
 * @desc    Get cattle statistics
 * @route   GET /api/v1/cattle/statistics
 * @access  Private
 */
const getCattleStatistics = asyncHandler(async (req, res) => {
  let matchQuery = {};

  // Apply access control
  if (req.userType === 'user') {
    matchQuery.owner = req.user._id;
  } else if (req.userType === 'admin' && req.user.role === 'regional_admin') {
    matchQuery['location.state'] = req.user.assignedRegion.state;
  }

  // Status counts
  const statusCounts = await Cattle.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Verification counts
  const verificationCounts = await Cattle.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$verification.status', count: { $sum: 1 } } }
  ]);

  // Breed distribution
  const breedDistribution = await Cattle.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$breed', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Location distribution
  const locationDistribution = await Cattle.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { state: '$location.state', district: '$location.district' },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const statistics = {
    total: await Cattle.countDocuments(matchQuery),
    byStatus: {},
    byVerification: {},
    byBreed: breedDistribution.map(item => ({
      breed: item._id,
      count: item.count
    })),
    byLocation: locationDistribution.map(item => ({
      state: item._id.state,
      district: item._id.district,
      count: item.count
    }))
  };

  statusCounts.forEach(item => {
    statistics.byStatus[item._id] = item.count;
  });

  verificationCounts.forEach(item => {
    statistics.byVerification[item._id] = item.count;
  });

  res.status(200).json({
    success: true,
    data: statistics
  });
});

module.exports = {
  // Registration & Viewing
  registerCattle,
  getAllCattle,
  getCattleById,
  searchCattleByImage,

  // Management
  archiveCattle,
  restoreCattle,
  deleteCattle,

  // Transfer
  initiateCattleTransfer,
  getCattleTransferHistory,

  // Images
  getCattleImages,

  // Statistics
  getCattleStatistics
};