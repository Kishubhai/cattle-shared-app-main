const { asyncHandler } = require('../middlewares/errorMiddleware');
const indianLocations = require('../data/indianLocations.json');

/**
 * @desc    Get all states and districts
 * @route   GET /api/v1/locations/states
 * @access  Public
 */
const getAllStates = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        data: indianLocations.states
    });
});

/**
 * @desc    Get districts for a specific state
 * @route   GET /api/v1/locations/states/:stateName/districts
 * @access  Public
 */
const getDistrictsByState = asyncHandler(async (req, res) => {
    const { stateName } = req.params;

    const state = indianLocations.states.find(
        s => s.name.toLowerCase() === stateName.toLowerCase()
    );

    if (!state) {
        return res.status(404).json({
            success: false,
            message: 'State not found'
        });
    }

    res.status(200).json({
        success: true,
        data: {
            state: state.name,
            code: state.code,
            districts: state.districts
        }
    });
});

/**
 * @desc    Get only state names (lightweight)
 * @route   GET /api/v1/locations/state-names
 * @access  Public
 */
const getStateNames = asyncHandler(async (req, res) => {
    const stateNames = indianLocations.states.map(state => ({
        name: state.name,
        code: state.code
    }));

    res.status(200).json({
        success: true,
        data: stateNames
    });
});

module.exports = {
    getAllStates,
    getDistrictsByState,
    getStateNames
};
