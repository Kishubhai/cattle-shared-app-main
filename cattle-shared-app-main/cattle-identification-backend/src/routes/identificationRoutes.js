const express = require('express');
const router = express.Router();
const {
  createIdentificationRequest,
  getMyIdentificationRequests,
  getIdentificationRequestById,
  cancelIdentificationRequest,
  getIdentificationStatistics
} = require('../controllers/identificationController');
const { protect } = require('../middlewares/authMiddleware');
const { userOnly } = require('../middlewares/roleMiddleware');
const { handleIdentificationImageUpload } = require('../middlewares/uploadMiddleware');
const { validateIdentificationRequest } = require('../middlewares/validationMiddleware');

/**
 * User Identification Request Routes
 * Handles user cattle identification by photo
 * Mounted at: /api/v1/cattle
 * Flow: User captures → Creates request → M_Admin processes → User gets result
 */

// Protect all routes
router.use(protect);

/**
 * @route   POST /api/v1/cattle/identify
 * @desc    Create identification request (User captures cattle photo)
 * @access  Private (User only)
 */
router.post(
  '/identify',
  userOnly,
  handleIdentificationImageUpload,
  validateIdentificationRequest,
  createIdentificationRequest
);

/**
 * @route   GET /api/v1/cattle/identify/my-requests
 * @desc    Get user's identification requests
 * @access  Private (User only)
 */
router.get('/identify/my-requests', userOnly, getMyIdentificationRequests);

/**
 * @route   GET /api/v1/cattle/identify/statistics
 * @desc    Get identification statistics
 * @access  Private
 */
router.get('/identify/statistics', getIdentificationStatistics);

/**
 * @route   GET /api/v1/cattle/identify/:id
 * @desc    Get single identification request
 * @access  Private (User only - own requests)
 */
router.get('/identify/:id', userOnly, getIdentificationRequestById);

/**
 * @route   PUT /api/v1/cattle/identify/:id/cancel
 * @desc    Cancel identification request
 * @access  Private (User only - own requests)
 */
router.put('/identify/:id/cancel', userOnly, cancelIdentificationRequest);

module.exports = router;