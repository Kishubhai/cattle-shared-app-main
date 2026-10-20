const express = require('express');
const router = express.Router();
const {
  // Admin Management
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

  // User Management
  getAllUsers,
  getUserById,
  searchUserByPhone,
  createFarmerByAdmin,

  // Dashboard & Statistics
  getAdminDashboard,

  // Notifications
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,

  // Cattle View
  getAllCattle,
  getCattleById,
  registerCattleByAdmin,

  // History & Modifications
  getVerificationHistory,
  updateVerificationDecision,

  // Delete
  deleteFarmerByAdmin,
  deleteCattleByAdmin,

  // ML Registration Management
  getMLFailedCattle,
  manualMLRegisterCattle,
  manuallyApproveCattle,

  // Account
  changeAdminPassword
} = require('../controllers/adminController');

// Identification Controller
const {
  getPendingIdentificationRequests,
  getIdentificationRequestForAdmin,
  getFarmerCattleForIdentification,
  startProcessingRequest,
  completeIdentificationRequest,
  failIdentificationRequest,
  getIdentificationHistory,
  updateIdentificationDecision
} = require('../controllers/identificationController');
const { protect } = require('../middlewares/authMiddleware');
const {
  adminOnly,
  superAdminOnly,
  regionalAdminOnly,
  mAdminOnly,
  checkRegionalAccess
} = require('../middlewares/roleMiddleware');
const { validateAdminDecision } = require('../middlewares/validationMiddleware');
const { handleCattleImageUpload } = require('../middlewares/uploadMiddleware');

/**
 * Admin Routes - Restructured to match frontend
 *
 * Route Structure:
 * - /api/v1/admin/super-admin/*      → Super Admin routes
 * - /api/v1/admin/regional-admin/*   → Regional Admin routes
 * - /api/v1/admin/m-admin/*          → M-Admin routes (verification)
 */

// Apply authentication to all admin routes
router.use(protect);
router.use(adminOnly);

// =====================================================
// SUPER ADMIN ROUTES - /api/v1/admin/super-admin/*
// =====================================================

/**
 * @route   POST /api/v1/admin/super-admin/regional-admins
 * @desc    Create regional admin account
 * @access  Private (Super Admin only)
 */
router.post('/super-admin/regional-admins', superAdminOnly, createRegionalAdmin);

/**
 * @route   GET /api/v1/admin/super-admin/regional-admins
 * @desc    Get all regional admins
 * @access  Private (Super Admin only)
 */
router.get('/super-admin/regional-admins', superAdminOnly, getAllAdmins);

/**
 * @route   GET /api/v1/admin/super-admin/regional-admins/:id
 * @desc    Get regional admin details by ID
 * @access  Private (Super Admin only)
 */
router.get('/super-admin/regional-admins/:id', superAdminOnly, getUserById);

/**
 * @route   PUT /api/v1/admin/super-admin/regional-admins/:id/approve
 * @desc    Approve regional admin account
 * @access  Private (Super Admin only)
 */
router.put('/super-admin/regional-admins/:id/approve', superAdminOnly, approveAdmin);

/**
 * @route   PUT /api/v1/admin/super-admin/regional-admins/:id/deactivate
 * @desc    Deactivate regional admin account
 * @access  Private (Super Admin only)
 */
router.put('/super-admin/regional-admins/:id/deactivate', superAdminOnly, deactivateAdmin);

/**
 * @route   PUT /api/v1/admin/super-admin/regional-admins/:id/activate
 * @desc    Activate regional admin account
 * @access  Private (Super Admin only)
 */
router.put('/super-admin/regional-admins/:id/activate', superAdminOnly, activateAdmin);

/**
 * @route   PUT /api/v1/admin/super-admin/regional-admins/:id/reject
 * @desc    Reject regional admin account
 * @access  Private (Super Admin only)
 */
router.put('/super-admin/regional-admins/:id/reject', superAdminOnly, deactivateAdmin);

/**
 * @route   POST /api/v1/admin/super-admin/m-admin
 * @desc    Create M-Admin account
 * @access  Private (Super Admin only)
 */
router.post('/super-admin/m-admin', superAdminOnly, createMAdmin);

/**
 * @route   GET /api/v1/admin/super-admin/farmers
 * @desc    Get all farmers/users
 * @access  Private (Super Admin only)
 */
router.get('/super-admin/farmers', superAdminOnly, getAllUsers);

/**
 * @route   POST /api/v1/admin/super-admin/farmers
 * @desc    Create new farmer (by admin)
 * @access  Private (Super Admin only)
 */
router.post('/super-admin/farmers', superAdminOnly, createFarmerByAdmin);

/**
 * @route   GET /api/v1/admin/super-admin/farmers/:id
 * @desc    Get farmer details by ID
 * @access  Private (Super Admin only)
 */
router.get('/super-admin/farmers/:id', superAdminOnly, getUserById);

/**
 * @route   GET /api/v1/admin/super-admin/cattle
 * @desc    Get all cattle (super admin view)
 * @access  Private (Super Admin only)
 */
router.get('/super-admin/cattle', superAdminOnly, getAllCattle);

/**
 * @route   POST /api/v1/admin/super-admin/cattle
 * @desc    Register cattle (by admin)
 * @access  Private (Super Admin only)
 */
router.post('/super-admin/cattle', superAdminOnly, handleCattleImageUpload, registerCattleByAdmin);

/**
 * @route   GET /api/v1/admin/super-admin/cattle/:id
 * @desc    Get cattle details by ID
 * @access  Private (Super Admin only)
 */
router.get('/super-admin/cattle/:id', superAdminOnly, getCattleById);

/**
 * @route   DELETE /api/v1/admin/super-admin/farmers/:id
 * @desc    Delete a farmer and their cattle
 * @access  Private (Super Admin only)
 */
router.delete('/super-admin/farmers/:id', superAdminOnly, deleteFarmerByAdmin);

/**
 * @route   GET /api/v1/admin/super-admin/statistics
 * @desc    Get super admin dashboard statistics
 * @access  Private (Super Admin only)
 */
router.get('/super-admin/statistics', superAdminOnly, getAdminDashboard);

/**
 * @route   GET /api/v1/admin/super-admin/archive
 * @desc    Get archived items
 * @access  Private (Super Admin only)
 */
router.get('/super-admin/archive', superAdminOnly, getAllCattle);

/**
 * @route   PUT /api/v1/admin/super-admin/archive/:id/restore
 * @desc    Restore archived item
 * @access  Private (Super Admin only)
 */
router.put('/super-admin/archive/:id/restore', superAdminOnly, getCattleById);

/**
 * @route   DELETE /api/v1/admin/super-admin/archive/:id
 * @desc    Delete archived item permanently
 * @access  Private (Super Admin only)
 */
router.delete('/super-admin/archive/:id', superAdminOnly, getCattleById);

/**
 * @route   POST /api/v1/admin/super-admin/search
 * @desc    Search cattle by text
 * @access  Private (Super Admin only)
 */
router.post('/super-admin/search', superAdminOnly, getAllCattle);

/**
 * @route   POST /api/v1/admin/super-admin/search-by-phone
 * @desc    Search farmer by phone
 * @access  Private (Super Admin only)
 */
router.post('/super-admin/search-by-phone', superAdminOnly, searchUserByPhone);

/**
 * @route   POST /api/v1/admin/super-admin/search-by-image
 * @desc    Search cattle by image
 * @access  Private (Super Admin only)
 */
router.post('/super-admin/search-by-image', superAdminOnly, getAllCattle);

/**
 * @route   POST /api/v1/admin/super-admin/reports/generate
 * @desc    Generate reports
 * @access  Private (Super Admin only)
 */
router.post('/super-admin/reports/generate', superAdminOnly, getAllCattle);

// =====================================================
// REGIONAL ADMIN ROUTES - /api/v1/admin/regional-admin/*
// =====================================================

/**
 * @route   GET /api/v1/admin/regional-admin/farmers
 * @desc    Get all farmers in region
 * @access  Private (Regional Admin only)
 */
router.get('/regional-admin/farmers', regionalAdminOnly, checkRegionalAccess, getAllUsers);

/**
 * @route   POST /api/v1/admin/regional-admin/farmers
 * @desc    Create new farmer (by regional admin)
 * @access  Private (Regional Admin only)
 */
router.post('/regional-admin/farmers', regionalAdminOnly, createFarmerByAdmin);

/**
 * @route   GET /api/v1/admin/regional-admin/farmers/:id
 * @desc    Get farmer details by ID
 * @access  Private (Regional Admin only)
 */
router.get('/regional-admin/farmers/:id', regionalAdminOnly, checkRegionalAccess, getUserById);

/**
 * @route   GET /api/v1/admin/regional-admin/cattle
 * @desc    Get all cattle in region
 * @access  Private (Regional Admin only)
 */
router.get('/regional-admin/cattle', regionalAdminOnly, checkRegionalAccess, getAllCattle);

/**
 * @route   POST /api/v1/admin/regional-admin/cattle
 * @desc    Register cattle (by regional admin)
 * @access  Private (Regional Admin only)
 */
router.post('/regional-admin/cattle', regionalAdminOnly, handleCattleImageUpload, registerCattleByAdmin);

/**
 * @route   GET /api/v1/admin/regional-admin/cattle/:id
 * @desc    Get cattle details by ID
 * @access  Private (Regional Admin only)
 */
router.get('/regional-admin/cattle/:id', regionalAdminOnly, checkRegionalAccess, getCattleById);

/**
 * @route   GET /api/v1/admin/regional-admin/statistics
 * @desc    Get regional admin dashboard statistics
 * @access  Private (Regional Admin only)
 */
router.get('/regional-admin/statistics', regionalAdminOnly, checkRegionalAccess, getAdminDashboard);

/**
 * @route   POST /api/v1/admin/regional-admin/search-by-phone
 * @desc    Search farmer by phone number in region
 * @access  Private (Regional Admin only)
 */
router.post('/regional-admin/search-by-phone', regionalAdminOnly, checkRegionalAccess, searchUserByPhone);

/**
 * @route   DELETE /api/v1/admin/regional-admin/farmers/:id
 * @desc    Delete a farmer (and their cattle)
 * @access  Private (Regional Admin only)
 */
router.delete('/regional-admin/farmers/:id', regionalAdminOnly, deleteFarmerByAdmin);

/**
 * @route   DELETE /api/v1/admin/regional-admin/cattle/:id
 * @desc    Delete a cattle record
 * @access  Private (Regional Admin only)
 */
router.delete('/regional-admin/cattle/:id', regionalAdminOnly, deleteCattleByAdmin);

/**
 * @route   POST /api/v1/admin/regional-admin/search
 * @desc    Search cattle by text in region
 * @access  Private (Regional Admin only)
 */
router.post('/regional-admin/search', regionalAdminOnly, getAllCattle);

/**
 * @route   POST /api/v1/admin/regional-admin/search-by-image
 * @desc    Search cattle by image in region
 * @access  Private (Regional Admin only)
 */
router.post('/regional-admin/search-by-image', regionalAdminOnly, getAllCattle);

/**
 * @route   POST /api/v1/admin/regional-admin/reports/generate
 * @desc    Generate regional reports
 * @access  Private (Regional Admin only)
 */
router.post('/regional-admin/reports/generate', regionalAdminOnly, getAllCattle);

// =====================================================
// M-ADMIN ROUTES - /api/v1/admin/m-admin/*
// (Verification Authority - Secret from users)
// =====================================================

/**
 * @route   GET /api/v1/admin/m-admin/cattle/pending
 * @desc    Get cattle pending M_Admin verification
 * @access  Private (M_Admin only)
 */
router.get('/m-admin/cattle/pending', mAdminOnly, getPendingMAdminVerification);

/**
 * @route   GET /api/v1/admin/m-admin/cattle/:id/verify
 * @desc    Get cattle details for M_Admin verification
 * @access  Private (M_Admin only)
 */
router.get('/m-admin/cattle/:id/verify', mAdminOnly, getCattleForMAdminVerification);

/**
 * @route   PUT /api/v1/admin/m-admin/cattle/:id/approve
 * @desc    Approve cattle by M_Admin
 * @access  Private (M_Admin only)
 */
router.put('/m-admin/cattle/:id/approve', mAdminOnly, approveCattleByMAdmin);

/**
 * @route   PUT /api/v1/admin/m-admin/cattle/:id/reject
 * @desc    Reject cattle by M_Admin
 * @access  Private (M_Admin only)
 */
router.put('/m-admin/cattle/:id/reject', mAdminOnly, validateAdminDecision, rejectCattleByMAdmin);

/**
 * @route   GET /api/v1/admin/m-admin/ml-failed-cattle
 * @desc    Get cattle that failed ML registration (manual_pending)
 * @access  Private (M_Admin only)
 */
router.get('/m-admin/ml-failed-cattle', mAdminOnly, getMLFailedCattle);

/**
 * @route   POST /api/v1/admin/m-admin/cattle/:id/register-ml
 * @desc    M-Admin triggers ML gallery registration (unlimited retries)
 * @access  Private (M_Admin only)
 */
router.post('/m-admin/cattle/:id/register-ml', mAdminOnly, manualMLRegisterCattle);

/**
 * @route   PUT /api/v1/admin/m-admin/cattle/:id/manually-approve
 * @desc    M-Admin manually approves cattle without ML
 * @access  Private (M_Admin only)
 */
router.put('/m-admin/cattle/:id/manually-approve', mAdminOnly, manuallyApproveCattle);

/**
 * @route   GET /api/v1/admin/m-admin/identification/pending
 * @desc    Get pending identification requests
 * @access  Private (M_Admin only)
 */
router.get('/m-admin/identification/pending', mAdminOnly, getPendingIdentificationRequests);

/**
 * @route   GET /api/v1/admin/m-admin/identification/:id
 * @desc    Get identification request details for processing
 * @access  Private (M_Admin only)
 */
router.get('/m-admin/identification/:id', mAdminOnly, getIdentificationRequestForAdmin);

/**
 * @route   GET /api/v1/admin/m-admin/identification/:id/farmer-cattle
 * @desc    Get all cattle of the farmer for identification matching
 * @access  Private (M_Admin only)
 */
router.get('/m-admin/identification/:id/farmer-cattle', mAdminOnly, getFarmerCattleForIdentification);

/**
 * @route   PUT /api/v1/admin/m-admin/identification/:id/start
 * @desc    Start processing identification request
 * @access  Private (M_Admin only)
 */
router.put('/m-admin/identification/:id/start', mAdminOnly, startProcessingRequest);

/**
 * @route   PUT /api/v1/admin/m-admin/identification/:id/complete
 * @desc    Complete identification request with result
 * @access  Private (M_Admin only)
 */
router.put('/m-admin/identification/:id/complete', mAdminOnly, completeIdentificationRequest);

/**
 * @route   PUT /api/v1/admin/m-admin/identification/:id/fail
 * @desc    Mark identification request as failed
 * @access  Private (M_Admin only)
 */
router.put('/m-admin/identification/:id/fail', mAdminOnly, failIdentificationRequest);

/**
 * @route   GET /api/v1/admin/m-admin/verification-history
 * @desc    Get cattle verification history (approved/rejected)
 * @access  Private (M_Admin only)
 */
router.get('/m-admin/verification-history', mAdminOnly, getVerificationHistory);

/**
 * @route   PUT /api/v1/admin/m-admin/verification-history/:id
 * @desc    Update cattle verification decision
 * @access  Private (M_Admin only)
 */
router.put('/m-admin/verification-history/:id', mAdminOnly, updateVerificationDecision);

/**
 * @route   GET /api/v1/admin/m-admin/identification-history
 * @desc    Get identification history (completed/failed)
 * @access  Private (M_Admin only)
 */
router.get('/m-admin/identification-history', mAdminOnly, getIdentificationHistory);

/**
 * @route   PUT /api/v1/admin/m-admin/identification-history/:id
 * @desc    Update identification decision
 * @access  Private (M_Admin only)
 */
router.put('/m-admin/identification-history/:id', mAdminOnly, updateIdentificationDecision);

// =====================================================
// COMMON ADMIN ROUTES (All admins)
// =====================================================

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (All admins)
 */
router.get('/dashboard', getAdminDashboard);

/**
 * @route   GET /api/v1/admin/notifications
 * @desc    Get admin notifications
 * @access  Private (All admins)
 */
router.get('/notifications', getAdminNotifications);

/**
 * @route   PUT /api/v1/admin/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (All admins)
 */
router.put('/notifications/:id/read', markNotificationAsRead);

/**
 * @route   PUT /api/v1/admin/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (All admins)
 */
router.put('/notifications/read-all', markAllNotificationsAsRead);

/**
 * @route   PUT /api/v1/admin/change-password
 * @desc    Change admin password
 * @access  Private (All admins)
 */
router.put('/change-password', changeAdminPassword);

module.exports = router;
