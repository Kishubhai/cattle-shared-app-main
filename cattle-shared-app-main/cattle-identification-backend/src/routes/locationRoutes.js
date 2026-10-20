const express = require('express');
const router = express.Router();
const {
    getAllStates,
    getDistrictsByState,
    getStateNames
} = require('../controllers/locationController');

/**
 * Location Routes
 * Public access - no authentication required for location data
 */

/**
 * @route   GET /api/v1/locations/states
 * @desc    Get all states with districts
 * @access  Public
 */
router.get('/states', getAllStates);

/**
 * @route   GET /api/v1/locations/state-names
 * @desc    Get only state names (lightweight)
 * @access  Public
 */
router.get('/state-names', getStateNames);

/**
 * @route   GET /api/v1/locations/states/:stateName/districts
 * @desc    Get districts for a specific state
 * @access  Public
 */
router.get('/states/:stateName/districts', getDistrictsByState);

module.exports = router;
