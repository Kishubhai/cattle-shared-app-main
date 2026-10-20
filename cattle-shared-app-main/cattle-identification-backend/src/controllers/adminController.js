const Admin = require('../models/Admin');
const User = require('../models/User');
const Cattle = require('../models/Cattle');
const TransferRequest = require('../models/TransferRequest');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const emailService = require('../utils/emailService');
const { generateTokenPair } = require('../utils/tokenGenerator');
/**
 * Admin Controller - CORRECTED WORKFLOW
 * Flow:
 * 1. User/Regional Admin/Super Admin submits cattle → Goes to M_Admin (SECRET)
 * 2. M_Admin (ONLY verification authority) → Approve OR Reject
 * 3. Regional Admin → VIEW/MANAGE only (no verification)
 * 4. Super Admin → Global management (no verification)
 */

// ========== ADMIN MANAGEMENT (SUPER ADMIN ONLY) ==========

/**
 * @desc    Create regional admin account
 * @route   POST /api/v1/admin/regional-admin
 * @access  Private (Super Admin only)
 */
const createRegionalAdmin = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        mobileNumber,
        password,
        assignedRegion,
        jurisdictionLevel = 'district' // Default to district level
    } = req.body;

    // Check if email or mobile already exists
    const adminExists = await Admin.findOne({
        $or: [{ email }, { mobileNumber }]
    });

    if (adminExists) {
        return res.status(400).json({
            success: false,
            message: adminExists.email === email
                ? 'Email already registered'
                : 'Mobile number already registered'
        });
    }

    // Validate assigned region based on jurisdiction level
    if (!assignedRegion || !assignedRegion.state) {
        return res.status(400).json({
            success: false,
            message: 'Assigned region with state is required'
        });
    }

    if (jurisdictionLevel === 'district' && !assignedRegion.district) {
        return res.status(400).json({
            success: false,
            message: 'District is required for district-level jurisdiction'
        });
    }

    if (jurisdictionLevel === 'pincode' && (!assignedRegion.district || !assignedRegion.pincode)) {
        return res.status(400).json({
            success: false,
            message: 'District and pincode are required for pincode-level jurisdiction'
        });
    }

    // Create regional admin
    const admin = await Admin.create({
        firstName,
        lastName,
        email,
        mobileNumber,
        password,
        role: 'regional_admin',
        jurisdictionLevel,
        assignedRegion,
        isApproved: true,
        isActive: true,
        approvedBy: req.user._id,
        approvedAt: new Date(),
        createdBy: 'super_admin'
    });

    await emailService.sendAdminApproved(email, `${firstName} ${lastName}`, 'regional_admin');

    res.status(201).json({
        success: true,
        message: 'Regional admin created successfully',
        data: {
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                role: admin.role,
                assignedRegion: admin.assignedRegion
            }
        }
    });
});

/**
 * @desc    Create M_Admin account
 * @route   POST /api/v1/admin/m-admin
 * @access  Private (Super Admin only)
 */
const createMAdmin = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        mobileNumber,
        password,
        assignedRegion,
        jurisdictionLevel = 'national' // M_Admin typically has national access
    } = req.body;

    // Check if email or mobile already exists
    const adminExists = await Admin.findOne({
        $or: [{ email }, { mobileNumber }]
    });

    if (adminExists) {
        return res.status(400).json({
            success: false,
            message: adminExists.email === email
                ? 'Email already registered'
                : 'Mobile number already registered'
        });
    }

    // Validate assigned region based on jurisdiction level
    if (jurisdictionLevel !== 'national') {
        if (!assignedRegion || !assignedRegion.state) {
            return res.status(400).json({
                success: false,
                message: 'Assigned region with state is required for non-national M_Admin'
            });
        }

        if (jurisdictionLevel === 'district' && !assignedRegion.district) {
            return res.status(400).json({
                success: false,
                message: 'District is required for district-level jurisdiction'
            });
        }

        if (jurisdictionLevel === 'pincode' && (!assignedRegion.district || !assignedRegion.pincode)) {
            return res.status(400).json({
                success: false,
                message: 'District and pincode are required for pincode-level jurisdiction'
            });
        }
    }

    // Create M_Admin
    const admin = await Admin.create({
        firstName,
        lastName,
        email,
        mobileNumber,
        password,
        role: 'm_admin',
        jurisdictionLevel,
        assignedRegion: jurisdictionLevel === 'national' ? {} : assignedRegion,
        isApproved: true,
        isActive: true,
        approvedBy: req.user._id,
        approvedAt: new Date(),
        createdBy: 'super_admin'
    });

    await emailService.sendAdminApproved(email, `${firstName} ${lastName}`, 'm_admin');

    res.status(201).json({
        success: true,
        message: 'M_Admin created successfully',
        data: {
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                role: admin.role,
                assignedRegion: admin.assignedRegion
            }
        }
    });
});

/**
 * @desc    Get all admins
 * @route   GET /api/v1/admin/admins
 * @access  Private (Super Admin only)
 */
const getAllAdmins = asyncHandler(async (req, res) => {
    const { role, isActive, isApproved, state, page = 1, limit = 20 } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (state) query['assignedRegion.state'] = state;

    const skip = (page - 1) * limit;

    const admins = await Admin.find(query)
        .populate('approvedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

    const total = await Admin.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            admins,
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
 * @desc    Approve admin account
 * @route   PUT /api/v1/admin/:id/approve
 * @access  Private (Super Admin only)
 */
const approveAdmin = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
        return res.status(404).json({
            success: false,
            message: 'Admin not found'
        });
    }

    if (admin.role === 'super_admin') {
        return res.status(400).json({
            success: false,
            message: 'Super admin does not need approval'
        });
    }

    if (admin.isApproved) {
        return res.status(400).json({
            success: false,
            message: 'Admin is already approved'
        });
    }

    admin.isApproved = true;
    admin.isActive = true;
    admin.approvedBy = req.user._id;
    admin.approvedAt = new Date();
    await admin.save();

    await emailService.sendAdminApproved(admin.email, admin.fullName, admin.role);

    await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'admin_approved',
        title: 'Account Approved',
        message: `Your ${admin.role.replace('_', ' ')} account has been approved.`,
        priority: 'high'
    });

    res.status(200).json({
        success: true,
        message: 'Admin approved successfully',
        data: admin
    });
});

/**
 * @desc    Deactivate admin account
 * @route   PUT /api/v1/admin/:id/deactivate
 * @access  Private (Super Admin only)
 */
const deactivateAdmin = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
        return res.status(404).json({
            success: false,
            message: 'Admin not found'
        });
    }

    if (admin.role === 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Cannot deactivate super admin account'
        });
    }

    admin.isActive = false;
    await admin.save();

    await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'account_deactivated',
        title: 'Account Deactivated',
        message: 'Your admin account has been deactivated.',
        priority: 'urgent'
    });

    res.status(200).json({
        success: true,
        message: 'Admin account deactivated successfully'
    });
});

/**
 * @desc    Activate admin account (reactivate)
 * @route   PUT /api/v1/admin/super-admin/regional-admins/:id/activate
 * @access  Private (Super Admin only)
 */
const activateAdmin = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
        return res.status(404).json({
            success: false,
            message: 'Admin not found'
        });
    }

    if (admin.role === 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Cannot modify super admin account'
        });
    }

    admin.isActive = true;
    await admin.save();

    await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'account_activated',
        title: 'Account Activated',
        message: 'Your admin account has been reactivated.',
        priority: 'high'
    });

    res.status(200).json({
        success: true,
        message: 'Admin account activated successfully'
    });
});

// ========== M_ADMIN: IDENTIFICATION & APPROVAL/REJECTION (ONLY VERIFICATION AUTHORITY) ==========

/**
 * @desc    Get pending cattle for M_Admin verification
 * @route   GET /api/v1/admin/m-admin/cattle/pending
 * @access  Private (M_Admin only)
 */
const getPendingMAdminVerification = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, overdue } = req.query;

    console.log('🔍 M-Admin Pending Cattle Request:', {
        user: req.user.email,
        role: req.user.role,
        assignedRegion: req.user.assignedRegion
    });

    // M-Admin only reviews cattle where ML registration failed (manual_pending)
    let query = {
        'mlRegistration.status': 'manual_pending'
    };

    console.log('🔍 Query:', JSON.stringify(query));

    // Filter by overdue
    if (overdue === 'true') {
        query['verification.turnaroundDeadline'] = { $lt: new Date() };
    }

    const skip = (page - 1) * limit;

    const cattle = await Cattle.find(query)
        .populate('owner', 'firstName lastName mobileNumber email address')
        .sort({ 'verification.submittedAt': 1 })
        .limit(parseInt(limit))
        .skip(skip);

    const total = await Cattle.countDocuments(query);

    console.log('📊 Found Cattle:', {
        count: cattle.length,
        total: total
    });

    const cattleWithStatus = cattle.map(c => {
        const cattleObj = c.toObject();
        cattleObj.isOverdue = c.isVerificationOverdue();
        // Determine request type based on context
        cattleObj.requestType = cattleObj.temporaryId ? 'verification' : 'identification';
        return cattleObj;
    });

    res.status(200).json({
        success: true,
        data: {
            cattle: cattleWithStatus,
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
 * @desc    Get cattle details for M_Admin verification with ALL other cattle for comparison
 * @route   GET /api/v1/admin/m-admin/cattle/:id/verify
 * @access  Private (M_Admin only)
 */
const getCattleForMAdminVerification = asyncHandler(async (req, res) => {
    console.log('🔍 M-Admin Verify Cattle Request:', {
        cattleId: req.params.id,
        user: req.user.email,
        role: req.user.role
    });

    let query = {
        _id: req.params.id,
        'verification.status': 'pending_verification'
    };

    // M_Admin can verify cattle from their region (skip filter for 'All States')
    if (req.user.role === 'm_admin' && req.user.assignedRegion && req.user.assignedRegion.state) {
        if (req.user.assignedRegion.state !== 'All States') {
            query['location.state'] = req.user.assignedRegion.state;
        }
    }

    console.log('🔍 Verify Query:', JSON.stringify(query));

    const cattle = await Cattle.findOne(query)
        .populate('owner', 'firstName lastName email mobileNumber address occupation');

    console.log('📊 Cattle Found:', cattle ? 'Yes' : 'No');

    if (!cattle) {
        return res.status(404).json({
            success: false,
            message: 'Cattle not found or not ready for M_Admin verification'
        });
    }

    // Get ALL other cattle for comparison (exclude current one)
    const allCattleQuery = {
        _id: { $ne: cattle._id },
        status: { $in: ['active', 'transit'] } // Include both active and pending cattle
    };

    // If M_Admin has region restriction, apply it to comparison cattle too
    if (req.user.role === 'm_admin' && req.user.assignedRegion && req.user.assignedRegion.state) {
        allCattleQuery['location.state'] = req.user.assignedRegion.state;
    }

    const allCattle = await Cattle.find(allCattleQuery)
        .populate('owner', 'firstName lastName mobileNumber')
        .select('cattleId breed age images owner location status verification')
        .sort({ createdAt: -1 });

    // Format submitted cattle with full image URLs
    const cattleData = cattle.toObject();
    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    const categories = ['muzzle', 'face', 'left', 'right', 'fullBodyLeft', 'fullBodyRight'];

    cattleData.formattedImages = {};
    categories.forEach(category => {
        if (cattle.images[category]) {
            cattleData.formattedImages[category] = cattle.images[category].map(img => ({
                filename: img.filename,
                url: `${baseUrl}/uploads/cattle/${category}/${img.filename}`,
                uploadedAt: img.uploadedAt,
                size: img.size
            }));
        }
    });

    // Format all cattle images for comparison
    const formattedAllCattle = allCattle.map(c => {
        const cattleObj = c.toObject();
        cattleObj.formattedImages = {};

        categories.forEach(category => {
            if (c.images[category]) {
                cattleObj.formattedImages[category] = c.images[category].map(img => ({
                    filename: img.filename,
                    url: `${baseUrl}/uploads/cattle/${category}/${img.filename}`,
                    uploadedAt: img.uploadedAt
                }));
            }
        });

        return cattleObj;
    });

    res.status(200).json({
        success: true,
        data: {
            submittedCattle: cattleData,
            allCattle: formattedAllCattle,
            totalComparisons: formattedAllCattle.length
        }
    });
});

/**
 * @desc    Approve cattle by M_Admin (ONLY M_Admin can approve)
 * @route   PUT /api/v1/admin/m-admin/cattle/:id/approve
 * @access  Private (M_Admin only)
 */
const approveCattleByMAdmin = asyncHandler(async (req, res) => {
    let query = {
        _id: req.params.id,
        'verification.status': 'pending_verification'
    };

    if (req.user.role === 'm_admin' && req.user.assignedRegion && req.user.assignedRegion.state) {
        if (req.user.assignedRegion.state !== 'All States') {
            query['location.state'] = req.user.assignedRegion.state;
        }
    }

    const cattle = await Cattle.findOne(query).populate('owner');

    if (!cattle) {
        return res.status(404).json({
            success: false,
            message: 'Cattle not found or not ready for approval'
        });
    }

    // Approve by M_Admin
    await cattle.approve(req.user._id);

    // Update M_Admin statistics
    const mAdmin = await Admin.findById(req.user._id);
    mAdmin.statistics.pendingVerifications = Math.max(0, mAdmin.statistics.pendingVerifications - 1);
    mAdmin.statistics.totalVerifications += 1;
    mAdmin.statistics.approvedCattle += 1;
    await mAdmin.save();

    // Notify owner (user doesn't know about M_Admin)
    await Notification.create({
        recipient: cattle.owner._id,
        recipientModel: 'User',
        type: 'cattle_approved',
        title: 'Cattle Registration Approved',
        message: `Your cattle registration (${cattle.cattleId}) has been approved and is now active.`,
        relatedCattle: cattle._id,
        priority: 'high',
        actionUrl: `/cattle/${cattle._id}`,
        actionText: 'View Cattle'
    });

    // Send email
    await emailService.sendCattleApproved(
        cattle.owner.email,
        cattle.owner.fullName,
        cattle.cattleId
    );

    res.status(200).json({
        success: true,
        message: 'Cattle approved successfully',
        data: cattle
    });
});

/**
 * @desc    Reject cattle by M_Admin (ONLY M_Admin can reject)
 * @route   PUT /api/v1/admin/m-admin/cattle/:id/reject
 * @access  Private (M_Admin only)
 */
const rejectCattleByMAdmin = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({
            success: false,
            message: 'Rejection reason is required'
        });
    }

    let query = {
        _id: req.params.id,
        'verification.status': 'pending_verification'
    };

    if (req.user.role === 'm_admin' && req.user.assignedRegion && req.user.assignedRegion.state) {
        if (req.user.assignedRegion.state !== 'All States') {
            query['location.state'] = req.user.assignedRegion.state;
        }
    }

    const cattle = await Cattle.findOne(query).populate('owner');

    if (!cattle) {
        return res.status(404).json({
            success: false,
            message: 'Cattle not found or not ready for rejection'
        });
    }

    // Reject by M_Admin
    await cattle.reject(req.user._id, reason);

    // Update M_Admin statistics
    const mAdmin = await Admin.findById(req.user._id);
    mAdmin.statistics.pendingVerifications = Math.max(0, mAdmin.statistics.pendingVerifications - 1);
    mAdmin.statistics.totalVerifications += 1;
    mAdmin.statistics.rejectedCattle += 1;
    await mAdmin.save();

    // Notify owner (user doesn't know about M_Admin - generic message)
    await Notification.create({
        recipient: cattle.owner._id,
        recipientModel: 'User',
        type: 'cattle_rejected',
        title: 'Cattle Registration Rejected',
        message: `Your cattle registration (${cattle.cattleId}) has been rejected. Reason: ${reason}`,
        relatedCattle: cattle._id,
        priority: 'high'
    });

    // Send email
    await emailService.sendCattleRejected(
        cattle.owner.email,
        cattle.owner.fullName,
        cattle.cattleId,
        reason
    );

    res.status(200).json({
        success: true,
        message: 'Cattle rejected successfully',
        data: cattle
    });
});

// ========== USER MANAGEMENT (ALL ADMINS - VIEW/MANAGE ONLY) ==========

/**
 * @desc    Get all users (farmers)
 * @route   GET /api/v1/admin/users
 * @access  Private (Admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const {
        state,
        district,
        isActive,
        isVerified,
        search,
        page = 1,
        limit = 20
    } = req.query;

    let query = {};

    // Apply jurisdiction-based filtering from middleware
    if (req.jurisdictionQuery && Object.keys(req.jurisdictionQuery).length > 0) {
        // Convert location.state to address.state for user queries
        if (req.jurisdictionQuery['location.state']) {
            query['address.state'] = req.jurisdictionQuery['location.state'];
        }
        if (req.jurisdictionQuery['location.district']) {
            query['address.district'] = req.jurisdictionQuery['location.district'];
        }
        if (req.jurisdictionQuery['location.pinCode']) {
            query['address.pinCode'] = req.jurisdictionQuery['location.pinCode'];
        }
    }

    // Apply additional filters (these can override or add to jurisdiction)
    if (state) query['address.state'] = state;
    if (district) query['address.district'] = district;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isVerified === 'true') {
        query.$or = [
            { isEmailVerified: true },
            { isMobileVerified: true }
        ];
    }

    // Search
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
        .populate({
            path: 'cattle',
            select: 'cattleId breed status',
            options: { strictPopulate: false }
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean();

    const total = await User.countDocuments(query);

    const formattedUsers = users.map(user => ({
        ...user,
        cattle: Array.isArray(user.cattle) ? user.cattle : []
    }));

    res.status(200).json({
        success: true,
        data: {
            users: formattedUsers,
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
 * @desc    Get user details by ID
 * @route   GET /api/v1/admin/users/:id
 * @access  Private (Admin only)
 */
const getUserById = asyncHandler(async (req, res) => {
    let query = { _id: req.params.id };

    // Regional Admin can only view users from their region
    if (req.user.role === 'regional_admin') {
        query['address.state'] = req.user.assignedRegion.state;
    }

    const user = await User.findOne(query)
        .populate({
            path: 'cattle',
            populate: { path: 'verification.verifiedBy', select: 'firstName lastName role' }
        });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found or you do not have permission to view'
        });
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

/**
 * @desc    Search user by phone number
 * @route   GET /api/v1/admin/users/search/phone/:phoneNumber
 * @access  Private (Admin only)
 */
const searchUserByPhone = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.params;

    let query = { mobileNumber: phoneNumber };

    // Regional Admin can only search in their region
    if (req.user.role === 'regional_admin') {
        query['address.state'] = req.user.assignedRegion.state;
    }

    const user = await User.findOne(query)
        .populate('cattle', 'cattleId breed age status verification');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found in your accessible region'
        });
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

// ========== ADMIN DASHBOARD & STATISTICS ==========

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/v1/admin/dashboard
 * @access  Private (Admin only)
 */
const getAdminDashboard = asyncHandler(async (req, res) => {
    let cattleQuery = {};
    let userQuery = {};

    // Apply jurisdiction-based filtering from middleware
    if (req.jurisdictionQuery) {
        // For cattle queries
        cattleQuery = { ...cattleQuery, ...req.jurisdictionQuery };

        // For user queries - convert location.X to address.X
        if (req.jurisdictionQuery['location.state']) {
            userQuery['address.state'] = req.jurisdictionQuery['location.state'];
        }
        if (req.jurisdictionQuery['location.district']) {
            userQuery['address.district'] = req.jurisdictionQuery['location.district'];
        }
        if (req.jurisdictionQuery['location.pinCode']) {
            userQuery['address.pinCode'] = req.jurisdictionQuery['location.pinCode'];
        }
    }

    // Total counts
    const totalUsers = await User.countDocuments(userQuery);
    const totalCattle = await Cattle.countDocuments(cattleQuery);

    // Admin counts (only for super_admin)
    let adminCounts = {};
    if (req.user.role === 'super_admin') {
        adminCounts.regional = await Admin.countDocuments({ role: 'regional_admin', isActive: true });
        adminCounts.mAdmin = await Admin.countDocuments({ role: 'm_admin', isActive: true });
        adminCounts.inactive = await Admin.countDocuments({ isActive: false });
    }

    // Cattle by status
    const cattleByStatus = await Cattle.aggregate([
        { $match: cattleQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Cattle by verification status
    const cattleByVerification = await Cattle.aggregate([
        { $match: cattleQuery },
        { $group: { _id: '$verification.status', count: { $sum: 1 } } }
    ]);

    // Role-specific statistics
    let roleSpecificStats = {};

    if (req.user.role === 'm_admin') {
        // Get real-time pending count
        const pendingCount = await Cattle.countDocuments({
            ...cattleQuery,
            status: 'transit',
            'verification.status': 'pending_verification'
        });

        // Get verified cattle by this M-Admin
        const verifiedByMAdmin = await Cattle.countDocuments({
            'verification.verifiedBy': req.user._id
        });

        // Get today's verifications
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayVerifications = await Cattle.countDocuments({
            'verification.verifiedBy': req.user._id,
            'verification.verifiedAt': { $gte: todayStart }
        });

        roleSpecificStats = {
            pendingVerification: pendingCount,
            approved: req.user.statistics?.approvedCattle || 0,
            rejected: req.user.statistics?.rejectedCattle || 0,
            totalVerifications: req.user.statistics?.totalVerifications || 0,
            todayVerifications: todayVerifications,
            verifiedByMe: verifiedByMAdmin
        };

        console.log('📊 M-Admin Stats:', roleSpecificStats);
    }

    // Overdue verifications
    const overdueVerifications = await Cattle.countDocuments({
        ...cattleQuery,
        status: 'transit',
        'verification.status': 'pending_verification',
        'verification.turnaroundDeadline': { $lt: new Date() }
    });

    // District-wise breakdown
    const districtBreakdown = await Cattle.aggregate([
        { $match: cattleQuery },
        {
            $group: {
                _id: '$location.district',
                totalCattle: { $sum: 1 },
                activeCattle: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                pendingVerification: {
                    $sum: { $cond: [{ $eq: ['$verification.status', 'pending_verification'] }, 1, 0] }
                }
            }
        },
        { $sort: { totalCattle: -1 } }
    ]);

    // Users by district
    const usersByDistrict = await User.aggregate([
        { $match: userQuery },
        {
            $group: {
                _id: '$address.district',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    const statistics = {
        overview: {
            totalUsers,
            totalCattle,
            overdueVerifications
        },
        cattle: {
            byStatus: {},
            byVerification: {}
        },
        admins: adminCounts,
        roleSpecific: roleSpecificStats,
        breakdown: {
            byDistrict: districtBreakdown,
            usersByDistrict
        }
    };

    cattleByStatus.forEach(item => {
        statistics.cattle.byStatus[item._id] = item.count;
    });

    cattleByVerification.forEach(item => {
        statistics.cattle.byVerification[item._id] = item.count;
    });

    res.status(200).json({
        success: true,
        data: statistics
    });
});

// ========== NOTIFICATIONS ==========

/**
 * @desc    Get admin notifications
 * @route   GET /api/v1/admin/notifications
 * @access  Private (Admin only)
 */
const getAdminNotifications = asyncHandler(async (req, res) => {
    const { isRead, page = 1, limit = 20 } = req.query;

    const query = {
        recipient: req.user._id,
        recipientModel: 'Admin'
    };

    if (isRead !== undefined) {
        query.isRead = isRead === 'true';
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
        .populate('relatedCattle', 'cattleId breed')
        .populate('relatedUser', 'firstName lastName mobileNumber')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(req.user._id, 'Admin');

    res.status(200).json({
        success: true,
        data: {
            notifications,
            unreadCount,
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
 * @desc    Mark notification as read
 * @route   PUT /api/v1/admin/notifications/:id/read
 * @access  Private (Admin only)
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: req.user._id,
        recipientModel: 'Admin'
    });

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found'
        });
    }

    await notification.markAsRead();

    res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification
    });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/v1/admin/notifications/read-all
 * @access  Private (Admin only)
 */
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const count = await Notification.markAllAsRead(req.user._id, 'Admin');

    res.status(200).json({
        success: true,
        message: `${count} notifications marked as read`
    });
});

// ========== CATTLE VIEW (ALL ADMINS) ==========

/**
 * @desc    Get all cattle (Admin view)
 * @route   GET /api/v1/admin/cattle
 * @access  Private (Admin only)
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
        limit = 20
    } = req.query;

    let query = {};

    // Apply jurisdiction-based filtering from middleware
    if (req.jurisdictionQuery) {
        query = { ...query, ...req.jurisdictionQuery };
    }

    // Apply additional filters
    if (status) query.status = status;
    if (verificationStatus) query['verification.status'] = verificationStatus;
    if (breed) query.breed = { $regex: breed, $options: 'i' };
    if (state) query['location.state'] = state;
    if (district) query['location.district'] = district;

    // Search
    if (search) {
        query.$or = [
            { cattleId: { $regex: search, $options: 'i' } },
            { tagNo: { $regex: search, $options: 'i' } },
            { breed: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;

    const cattle = await Cattle.find(query)
        .populate('owner', 'firstName lastName mobileNumber address')
        .populate('verification.verifiedBy', 'firstName lastName role')
        .sort({ createdAt: -1 })
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
 * @desc    Get single cattle by ID (Admin view)
 * @route   GET /api/v1/admin/cattle/:id
 * @access  Private (Admin only)
 */
const getCattleById = asyncHandler(async (req, res) => {
    let query = { _id: req.params.id };

    // Apply jurisdiction-based filtering from middleware
    if (req.jurisdictionQuery) {
        query = { ...query, ...req.jurisdictionQuery };
    }

    const cattle = await Cattle.findOne(query)
        .populate('owner', 'firstName lastName email mobileNumber address')
        .populate('verification.verifiedBy', 'firstName lastName role')
        .populate('transferHistory');

    if (!cattle) {
        return res.status(404).json({
            success: false,
            message: 'Cattle not found or you do not have permission to view'
        });
    }

    res.status(200).json({
        success: true,
        data: cattle
    });
});

// ========== FARMER CREATION (ADMIN) ==========

/**
 * @desc    Create new farmer/user (by Admin)
 * @route   POST /api/v1/admin/super-admin/farmers OR /api/v1/admin/regional-admin/farmers
 * @access  Private (Super Admin or Regional Admin)
 */
const createFarmerByAdmin = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        mobileNumber,
        password,
        dateOfBirth,
        occupation,
        address
    } = req.body;

    // Regional Admin can only create farmers in their assigned state AND district
    if (req.user.role === 'regional_admin') {
        const adminState = req.user.assignedRegion?.state;
        const adminDistrict = req.user.assignedRegion?.district;
        if (!address || address.state !== adminState) {
            return res.status(403).json({
                success: false,
                message: `You can only create farmers in your assigned state (${adminState})`
            });
        }
        if (adminDistrict && address.district !== adminDistrict) {
            return res.status(403).json({
                success: false,
                message: `You can only create farmers in your assigned district (${adminDistrict})`
            });
        }
    }

    // Check if user already exists
    const userExists = await User.findOne({
        $or: [{ email }, { mobileNumber }]
    });

    if (userExists) {
        return res.status(400).json({
            success: false,
            message: userExists.email === email
                ? 'Email already registered'
                : 'Mobile number already registered'
        });
    }

    // Validate required fields
    if (!address || !address.state || !address.district) {
        return res.status(400).json({
            success: false,
            message: 'Address with state and district is required'
        });
    }

    // Create user
    const user = await User.create({
        firstName,
        lastName,
        email,
        mobileNumber,
        password,
        dateOfBirth,
        occupation,
        address,
        isMobileVerified: true, // Admin-created users are pre-verified
        isEmailVerified: true,
        createdBy: req.user._id,
        createdByModel: 'Admin'
    });

    // Send welcome email (commented out - email service not configured)
    // await emailService.sendWelcomeEmail(email, `${firstName} ${lastName}`);

    // Create notification for the farmer
    await Notification.create({
        recipient: user._id,
        recipientModel: 'User',
        type: 'account_created',
        title: 'Welcome to Cattle Identification System',
        message: `Your farmer account has been created by ${req.user.role.replace('_', ' ')}. You can now login and register your cattle.`,
        priority: 'high'
    });

    res.status(201).json({
        success: true,
        message: 'Farmer created successfully',
        data: {
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                mobileNumber: user.mobileNumber,
                address: user.address
            }
        }
    });
});

// ========== CATTLE REGISTRATION (ADMIN) ==========

/**
 * @desc    Register cattle on behalf of farmer (by Admin)
 * @route   POST /api/v1/admin/super-admin/cattle OR /api/v1/admin/regional-admin/cattle
 * @access  Private (Super Admin or Regional Admin)
 */
const registerCattleByAdmin = asyncHandler(async (req, res) => {
    const {
        ownerId, // Farmer ID
        breed,
        tagNo,
        medicalHistory,
        age,
        type,
        color
    } = req.body;

    // Find the farmer/owner
    const owner = await User.findById(ownerId);

    if (!owner) {
        return res.status(404).json({
            success: false,
            message: 'Farmer not found'
        });
    }

    // Regional Admin can only register cattle for farmers in their region
    if (req.user.role === 'regional_admin') {
        if (owner.address.state !== req.user.assignedRegion.state) {
            return res.status(403).json({
                success: false,
                message: 'You can only register cattle for farmers in your assigned region'
            });
        }
    }

    // Check if images are uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Please upload all required images (12 total)'
        });
    }

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
        owner: ownerId,
        breed,
        tagNo,
        medicalHistory,
        age,
        type,
        color,
        images,
        location: {
            state: owner.address.state,
            district: owner.address.district,
            pinCode: owner.address.pinCode
        },
        status: 'transit', // Starts in transit, pending verification
        verification: {
            status: 'pending_verification',
            submittedAt: new Date()
        },
        registeredBy: req.user._id,
        registeredByModel: 'Admin'
    });

    // Add cattle to owner's cattle array
    owner.cattle.push(cattle._id);
    await owner.save();

    // Create notification for M_Admin (verification authority)
    const mAdmins = await Admin.find({
        role: 'm_admin',
        isActive: true,
        isApproved: true
    });

    for (const mAdmin of mAdmins) {
        await Notification.create({
            recipient: mAdmin._id,
            recipientModel: 'Admin',
            type: 'cattle_registered',
            title: 'New Cattle Pending Verification',
            message: `New cattle (${cattle.cattleId}) registered by admin for farmer ${owner.fullName} in ${owner.address.district}, ${owner.address.state}.`,
            relatedCattle: cattle._id,
            relatedUser: owner._id,
            priority: 'high',
            actionUrl: `/admin/m-admin/cattle/${cattle._id}/verify`,
            actionText: 'Verify Now'
        });

        mAdmin.statistics.pendingVerifications += 1;
        await mAdmin.save();
    }

    // Notify farmer
    await Notification.create({
        recipient: owner._id,
        recipientModel: 'User',
        type: 'cattle_registered',
        title: 'Cattle Registered',
        message: `Your cattle (${cattle.cattleId}) has been registered by admin. It is pending verification.`,
        relatedCattle: cattle._id,
        priority: 'medium'
    });

    res.status(201).json({
        success: true,
        message: 'Cattle registered successfully. Pending M-Admin verification.',
        data: {
            cattle: {
                id: cattle._id,
                cattleId: cattle.cattleId,
                breed: cattle.breed,
                tagNo: cattle.tagNo,
                owner: {
                    id: owner._id,
                    name: owner.fullName
                },
                status: cattle.status
            }
        }
    });
});

/**
 * @desc    Get cattle verification history (approved/rejected)
 * @route   GET /api/v1/admin/m-admin/verification-history
 * @access  Private (M_Admin only)
 */
const getVerificationHistory = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20, search } = req.query;

    const query = {
        'verification.status': { $in: ['approved', 'rejected'] }
    };

    // Filter by status if provided
    if (status && ['approved', 'rejected'].includes(status)) {
        query['verification.status'] = status;
    }

    // Search by cattleId or breed
    if (search) {
        query.$or = [
            { cattleId: { $regex: search, $options: 'i' } },
            { breed: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [cattle, total] = await Promise.all([
        Cattle.find(query)
            .populate('owner', 'firstName lastName mobileNumber email address')
            .populate('verification.verifiedBy', 'firstName lastName role')
            .sort({ 'verification.verifiedAt': -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Cattle.countDocuments(query)
    ]);

    // Format cattle data with image URLs
    const formattedCattle = cattle.map(c => {
        const cattleObj = c.toObject();

        // Format images
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

        // Add message field for frontend (from rejectionReason)
        if (cattleObj.verification) {
            cattleObj.verification.message = cattleObj.verification.rejectionReason;
        }

        return cattleObj;
    });

    res.status(200).json({
        success: true,
        data: {
            cattle: formattedCattle,
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
 * @desc    Update cattle verification decision
 * @route   PUT /api/v1/admin/m-admin/verification-history/:id
 * @access  Private (M_Admin only)
 */
const updateVerificationDecision = asyncHandler(async (req, res) => {
    const { newDecision, message } = req.body;

    if (!['approved', 'rejected'].includes(newDecision)) {
        return res.status(400).json({
            success: false,
            message: 'Decision must be either approved or rejected'
        });
    }

    const cattle = await Cattle.findById(req.params.id)
        .populate('owner', 'firstName lastName mobileNumber email');

    if (!cattle) {
        return res.status(404).json({
            success: false,
            message: 'Cattle not found'
        });
    }

    const oldStatus = cattle.verification.status;
    const oldMessage = cattle.verification.rejectionReason;

    if (newDecision === 'approved') {
        // Approve
        cattle.verification.status = 'approved';
        cattle.verification.rejectionReason = undefined; // Clear rejection reason
        cattle.verification.verifiedBy = req.user._id;
        cattle.verification.verifiedAt = new Date();
        cattle.status = 'active';

        // Notify farmer
        await Notification.create({
            recipient: cattle.owner._id,
            recipientModel: 'User',
            type: 'cattle_approved',
            title: 'Cattle Approved',
            message: message || `Your cattle ${cattle.cattleId} has been approved after review.`,
            relatedCattle: cattle._id,
            priority: 'high'
        });
    } else {
        // Reject
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Rejection message is required'
            });
        }

        cattle.verification.status = 'rejected';
        cattle.verification.rejectionReason = message;
        cattle.verification.verifiedBy = req.user._id;
        cattle.verification.verifiedAt = new Date();
        cattle.status = 'transit'; // Keep in transit state, not archive

        // Notify farmer
        await Notification.create({
            recipient: cattle.owner._id,
            recipientModel: 'User',
            type: 'cattle_rejected',
            title: 'Cattle Rejected',
            message: `Your cattle ${cattle.cattleId} has been rejected after review. Reason: ${message}`,
            relatedCattle: cattle._id,
            priority: 'high'
        });
    }

    await cattle.save();

    res.status(200).json({
        success: true,
        message: `Cattle verification updated from ${oldStatus} to ${cattle.verification.status}`,
        data: cattle
    });
});

/**
 * @desc    Delete farmer by admin (Regional Admin / Super Admin)
 * @route   DELETE /api/v1/admin/regional-admin/farmers/:id
 * @access  Private (Regional Admin / Super Admin)
 */
const deleteFarmerByAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    // Regional admin can only delete farmers in their jurisdiction
    if (req.user.role === 'regional_admin') {
        const adminState = req.user.assignedRegion?.state;
        const adminDistrict = req.user.assignedRegion?.district;
        if (user.address?.state !== adminState) {
            return res.status(403).json({ success: false, message: 'You can only delete farmers in your assigned state' });
        }
        if (adminDistrict && user.address?.district !== adminDistrict) {
            return res.status(403).json({ success: false, message: 'You can only delete farmers in your assigned district' });
        }
    }

    // Also delete all cattle owned by this farmer
    await Cattle.deleteMany({ owner: id });

    await User.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'Farmer and their cattle deleted successfully'
    });
});

// ========== ML REGISTRATION MANAGEMENT (M-ADMIN) ==========

/**
 * @desc    Get cattle that failed ML gallery registration and need manual action
 * @route   GET /api/v1/admin/m-admin/ml-failed-cattle
 * @access  Private (M_Admin only)
 */
const getMLFailedCattle = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // M-Admin sees cattle that failed ML registration (both retrying and escalated)
    const query = { 'mlRegistration.status': { $in: ['in_progress', 'manual_pending'] } };

    const cattle = await Cattle.find(query)
        .populate('owner', 'firstName lastName mobileNumber email address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Cattle.countDocuments(query);

    // Format images
    const formattedCattle = cattle.map(c => {
        const obj = c.toObject();
        if (obj.images?.muzzle?.[0]) {
            obj.images.muzzle[0].url = `/uploads/cattle/muzzle/${obj.images.muzzle[0].filename}`;
        }
        return obj;
    });

    res.status(200).json({
        success: true,
        data: {
            cattle: formattedCattle,
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
 * @desc    Manually trigger ML gallery registration for a cattle (M-Admin action)
 * @route   POST /api/v1/admin/m-admin/cattle/:id/register-ml
 * @access  Private (M_Admin only)
 */
const manualMLRegisterCattle = asyncHandler(async (req, res) => {
    const { addUnknownCattle } = require('../utils/mlService');

    const cattle = await Cattle.findById(req.params.id);
    if (!cattle) {
        return res.status(404).json({ success: false, message: 'Cattle not found' });
    }

    const muzzleImage = cattle.images?.muzzle?.[0];
    if (!muzzleImage || !muzzleImage.path) {
        return res.status(400).json({ success: false, message: 'No muzzle image available for ML registration' });
    }

    const mlResult = await addUnknownCattle(muzzleImage.path, cattle.cattleId);

    if (mlResult && mlResult.status === 'added') {
        // ML success → auto-approve
        await Cattle.findByIdAndUpdate(cattle._id, {
            'mlRegistration.status': 'registered',
            'mlRegistration.registeredAt': new Date(),
            'mlRegistration.lastRetryAt': new Date(),
            status: 'active',
            'verification.status': 'approved',
            'verification.reviewedAt': new Date(),
            'verification.reviewedBy': req.user._id,
            'verification.notes': 'Registered in AI system by M-Admin'
        });

        await Notification.create({
            recipient: cattle.owner,
            recipientModel: 'User',
            type: 'cattle_approved',
            title: 'Cattle Registration Approved',
            message: `Your cattle ${cattle.cattleId} has been successfully registered in the AI system and approved.`,
            relatedCattle: cattle._id,
            priority: 'medium'
        });

        res.status(200).json({
            success: true,
            message: `Cattle ${cattle.cattleId} registered in AI and approved`,
            data: { cattleId: cattle.cattleId }
        });
    } else {
        res.status(502).json({
            success: false,
            message: 'AI registration failed. The model may be temporarily unavailable. Please try again.'
        });
    }
});

/**
 * @desc    Manually approve cattle without ML (M-Admin action when model is down)
 * @route   PUT /api/v1/admin/m-admin/cattle/:id/manually-approve
 * @access  Private (M_Admin only)
 */
const manuallyApproveCattle = asyncHandler(async (req, res) => {
    const cattle = await Cattle.findById(req.params.id);
    if (!cattle) {
        return res.status(404).json({ success: false, message: 'Cattle not found' });
    }

    await Cattle.findByIdAndUpdate(cattle._id, {
        'mlRegistration.status': 'registered',
        'mlRegistration.registeredAt': new Date(),
        status: 'active',
        'verification.status': 'approved',
        'verification.reviewedAt': new Date(),
        'verification.reviewedBy': req.user._id,
        'verification.notes': 'Manually approved by M-Admin'
    });

    await Notification.create({
        recipient: cattle.owner,
        recipientModel: 'User',
        type: 'cattle_approved',
        title: 'Cattle Registration Approved',
        message: `Your cattle ${cattle.cattleId} has been manually reviewed and approved by our team.`,
        relatedCattle: cattle._id,
        priority: 'medium'
    });

    res.status(200).json({
        success: true,
        message: `Cattle ${cattle.cattleId} manually approved`,
        data: { cattleId: cattle.cattleId }
    });
});

/**
 * @desc    Delete cattle by admin (Regional Admin / Super Admin)
 * @route   DELETE /api/v1/admin/regional-admin/cattle/:id
 * @access  Private (Regional Admin / Super Admin)
 */
const deleteCattleByAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const cattle = await Cattle.findById(id);
    if (!cattle) {
        return res.status(404).json({ success: false, message: 'Cattle not found' });
    }

    // Regional admin can only delete cattle in their jurisdiction
    if (req.user.role === 'regional_admin') {
        const adminState = req.user.assignedRegion?.state;
        const adminDistrict = req.user.assignedRegion?.district;
        if (cattle.location?.state !== adminState) {
            return res.status(403).json({ success: false, message: 'You can only delete cattle in your assigned state' });
        }
        if (adminDistrict && cattle.location?.district !== adminDistrict) {
            return res.status(403).json({ success: false, message: 'You can only delete cattle in your assigned district' });
        }
    }

    // Cancel any pending transfer requests involving this cattle
    await TransferRequest.updateMany(
        { cattle: id, status: 'pending' },
        { status: 'cancelled', cancellationReason: 'Cattle deleted by admin', cancelledAt: new Date() }
    );

    // Remove cattle reference from owner's cattle array
    await User.findByIdAndUpdate(cattle.owner, { $pull: { cattle: cattle._id } });

    await Cattle.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'Cattle deleted successfully'
    });
});

// ========== CHANGE PASSWORD (ALL ADMINS) ==========

const changeAdminPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    const admin = await Admin.findById(req.user._id).select('+password');
    if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
});

module.exports = {
    // Admin Management (Super Admin only)
    createRegionalAdmin,
    createMAdmin,
    getAllAdmins,
    approveAdmin,
    deactivateAdmin,
    activateAdmin,

    // M_Admin Operations (ONLY VERIFICATION AUTHORITY)
    getPendingMAdminVerification,
    getCattleForMAdminVerification,
    approveCattleByMAdmin,
    rejectCattleByMAdmin,

    // User Management (VIEW/MANAGE only)
    getAllUsers,
    getUserById,
    searchUserByPhone,
    createFarmerByAdmin,
    deleteFarmerByAdmin,
    deleteCattleByAdmin,

    // Dashboard & Statistics
    getAdminDashboard,

    // Notifications
    getAdminNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,

    // Cattle View
    getAllCattle,
    getCattleById,
    registerCattleByAdmin, // NEW

    // History & Modifications
    getVerificationHistory,
    updateVerificationDecision,

    // ML Registration Management (M-Admin)
    getMLFailedCattle,
    manualMLRegisterCattle,
    manuallyApproveCattle,

    // Account
    changeAdminPassword
};
