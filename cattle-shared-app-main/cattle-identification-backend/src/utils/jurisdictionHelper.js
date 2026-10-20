/**
 * Utility functions for handling admin jurisdiction-based filtering
 */

/**
 * Get jurisdiction query filter based on admin's jurisdiction level
 * @param {Object} admin - Admin document with jurisdictionLevel and assignedRegion
 * @returns {Object} MongoDB query filter
 */
const getJurisdictionQuery = (admin) => {
  // Super admin sees everything
  if (admin.role === 'super_admin' || admin.jurisdictionLevel === 'national') {
    return {};
  }

  const query = {};

  // Build query based on jurisdiction level
  switch (admin.jurisdictionLevel) {
    case 'state':
      // State-level: filter by state only
      if (admin.assignedRegion?.state) {
        query['location.state'] = admin.assignedRegion.state;
      }
      break;

    case 'district':
      // District-level: filter by state AND district
      if (admin.assignedRegion?.state) {
        query['location.state'] = admin.assignedRegion.state;
      }
      if (admin.assignedRegion?.district) {
        query['location.district'] = admin.assignedRegion.district;
      }
      break;

    case 'pincode':
      // Pincode-level: filter by state, district, AND pincode
      if (admin.assignedRegion?.state) {
        query['location.state'] = admin.assignedRegion.state;
      }
      if (admin.assignedRegion?.district) {
        query['location.district'] = admin.assignedRegion.district;
      }
      if (admin.assignedRegion?.pincode) {
        query['location.pinCode'] = admin.assignedRegion.pincode;
      }
      break;

    default:
      // If no valid jurisdiction level, restrict to assigned state as fallback
      if (admin.assignedRegion?.state) {
        query['location.state'] = admin.assignedRegion.state;
      }
  }

  return query;
};

/**
 * Get jurisdiction query for users/farmers (owner field is referenced)
 * @param {Object} admin - Admin document
 * @param {String} ownerFieldPath - Path to owner field (e.g., 'owner' or 'user')
 * @returns {Object} MongoDB query filter with $or conditions for owner lookup
 */
const getJurisdictionQueryWithOwner = async (admin, ownerFieldPath = 'owner') => {
  const User = require('../models/User');

  // Super admin sees everything
  if (admin.role === 'super_admin' || admin.jurisdictionLevel === 'national') {
    return {};
  }

  // Build user query based on jurisdiction
  const userQuery = {};

  switch (admin.jurisdictionLevel) {
    case 'state':
      if (admin.assignedRegion?.state) {
        userQuery['address.state'] = admin.assignedRegion.state;
      }
      break;

    case 'district':
      if (admin.assignedRegion?.state) {
        userQuery['address.state'] = admin.assignedRegion.state;
      }
      if (admin.assignedRegion?.district) {
        userQuery['address.district'] = admin.assignedRegion.district;
      }
      break;

    case 'pincode':
      if (admin.assignedRegion?.state) {
        userQuery['address.state'] = admin.assignedRegion.state;
      }
      if (admin.assignedRegion?.district) {
        userQuery['address.district'] = admin.assignedRegion.district;
      }
      if (admin.assignedRegion?.pincode) {
        userQuery['address.pinCode'] = admin.assignedRegion.pincode;
      }
      break;
  }

  // Get user IDs that match jurisdiction
  const users = await User.find(userQuery).select('_id');
  const userIds = users.map(u => u._id);

  // Return query that filters by user IDs
  return {
    [ownerFieldPath]: { $in: userIds }
  };
};

/**
 * Validate if admin can access a specific location
 * @param {Object} admin - Admin document
 * @param {String} state - State name
 * @param {String} district - District name (optional)
 * @param {String} pincode - Pincode (optional)
 * @returns {Boolean} True if admin has access
 */
const validateAdminAccess = (admin, state, district = null, pincode = null) => {
  // Super admin has access to everything
  if (admin.role === 'super_admin' || admin.jurisdictionLevel === 'national') {
    return true;
  }

  switch (admin.jurisdictionLevel) {
    case 'state':
      return admin.assignedRegion?.state === state;

    case 'district':
      return admin.assignedRegion?.state === state &&
             (!district || admin.assignedRegion?.district === district);

    case 'pincode':
      return admin.assignedRegion?.state === state &&
             (!district || admin.assignedRegion?.district === district) &&
             (!pincode || admin.assignedRegion?.pincode === pincode);

    default:
      return false;
  }
};

/**
 * Normalize location names to match the JSON data (proper case, trimmed)
 * @param {String} locationName - State or district name
 * @returns {String} Normalized name
 */
const normalizeLocationName = (locationName) => {
  if (!locationName) return '';

  // Trim and convert to proper case (each word capitalized)
  return locationName
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

module.exports = {
  getJurisdictionQuery,
  getJurisdictionQueryWithOwner,
  validateAdminAccess,
  normalizeLocationName
};
