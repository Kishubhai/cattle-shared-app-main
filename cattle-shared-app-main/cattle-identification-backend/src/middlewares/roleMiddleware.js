/**
 * Role-Based Access Control Middleware
 * Restricts access based on user roles
 * Roles: user, regional_admin, super_admin
 */

const { getJurisdictionQuery } = require('../utils/jurisdictionHelper');

/**
 * Authorize specific roles
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (should be set by protect middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource'
      });
    }

    // Check user role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

/**
 * User only access (Farmers/Cattle Owners)
 */
const userOnly = (req, res, next) => {
  if (req.userType !== 'user' || req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'This resource is only accessible to registered users/farmers'
    });
  }
  next();
};

/**
 * Admin only access (Regional Admin or Super Admin)
 */
const adminOnly = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'This resource is only accessible to administrators'
    });
  }

  if (req.user.role !== 'regional_admin' && req.user.role !== 'super_admin' && req.user.role !== 'm_admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Regional Admin only access
 */
const regionalAdminOnly = (req, res, next) => {
  if (req.userType !== 'admin' || req.user.role !== 'regional_admin') {
    return res.status(403).json({
      success: false,
      message: 'This resource is only accessible to regional administrators'
    });
  }

  // Check if regional admin is approved
  if (!req.user.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Your regional admin account is pending approval'
    });
  }

  next();
};

/**
 * Super Admin only access
 */
const superAdminOnly = (req, res, next) => {
  if (req.userType !== 'admin' || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'This resource is only accessible to super administrators'
    });
  }

  next();
};

/**
 * Check regional access - Attach jurisdiction query to request
 * Works with state, district, and pincode level jurisdictions
 */
const checkRegionalAccess = (req, res, next) => {
  // Super admin and M_Admin have access to all regions (national scope)
  if (req.user.role === 'super_admin' || req.user.role === 'm_admin' || req.user.jurisdictionLevel === 'national') {
    req.jurisdictionQuery = {};
    req.assignedRegion = null;
    return next();
  }

  // Regional admin must have assigned region
  if (req.user.role === 'regional_admin') {
    if (!req.user.assignedRegion || !req.user.assignedRegion.state) {
      return res.status(403).json({
        success: false,
        message: 'No region assigned to your admin account'
      });
    }

    // Generate jurisdiction query based on admin's level
    req.jurisdictionQuery = getJurisdictionQuery(req.user);
    req.assignedRegion = req.user.assignedRegion;
    req.jurisdictionLevel = req.user.jurisdictionLevel;
  }

  next();
};

/**
 * Check if admin can manage specific user
 * Uses jurisdiction-based access control
 */
const canManageUser = async (req, res, next) => {
  try {
    // Super admin can manage all users
    if (req.user.role === 'super_admin' || req.user.jurisdictionLevel === 'national') {
      return next();
    }

    // Get user ID from various sources
    const userId = req.params.id || req.params.userId || req.body.userId;

    if (!userId) {
      return next();
    }

    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check jurisdiction-based access
    const canAccess = req.user.canManageRegion(
      user.address.state,
      user.address.district,
      user.address.pinCode
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You can only manage users from your assigned jurisdiction'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking user management permissions'
    });
  }
};

/**
 * Check if admin can manage specific cattle
 * Uses jurisdiction-based access control
 */
const canManageCattle = async (req, res, next) => {
  try {
    // Super admin can manage all cattle
    if (req.user.role === 'super_admin' || req.user.jurisdictionLevel === 'national') {
      return next();
    }

    // Get cattle ID from various sources
    const cattleId = req.params.id || req.params.cattleId || req.body.cattleId;

    if (!cattleId) {
      return next();
    }

    const Cattle = require('../models/Cattle');
    const cattle = await Cattle.findById(cattleId).populate('owner');

    if (!cattle) {
      return res.status(404).json({
        success: false,
        message: 'Cattle not found'
      });
    }

    // Check jurisdiction-based access
    const canAccess = req.user.canManageRegion(
      cattle.location.state,
      cattle.location.district,
      cattle.location.pinCode
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You can only manage cattle from your assigned jurisdiction'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking cattle management permissions'
    });
  }
};

/**
 * Check ownership - User can only access/modify their own resources
 */
const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Admins can access all resources
      if (req.userType === 'admin') {
        return next();
      }

      const resourceId = req.params.id || req.params.cattleId;

      if (!resourceId) {
        return next();
      }

      if (resourceType === 'cattle') {
        const Cattle = require('../models/Cattle');
        const cattle = await Cattle.findById(resourceId);

        if (!cattle) {
          return res.status(404).json({
            success: false,
            message: 'Cattle not found'
          });
        }

        // Check if user owns this cattle
        if (cattle.owner.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this cattle'
          });
        }
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking ownership'
      });
    }
  };
};


/**
 * M_Admin only access (NEW)
 */
const mAdminOnly = (req, res, next) => {
  if (req.userType !== 'admin' || req.user.role !== 'm_admin') {
    return res.status(403).json({
      success: false,
      message: 'This resource is only accessible to M_Admins'
    });
  }

  // Check if M_Admin is approved
  if (!req.user.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Your M_Admin account is pending approval'
    });
  }

  next();
};

/**
 * Regional Admin or M_Admin access (NEW)
 */
const regionalOrMAdminOnly = (req, res, next) => {
  if (req.userType !== 'admin' || 
      (req.user.role !== 'regional_admin' && req.user.role !== 'm_admin')) {
    return res.status(403).json({
      success: false,
      message: 'This resource is only accessible to Regional Admins or M_Admins'
    });
  }

  if (!req.user.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Your admin account is pending approval'
    });
  }

  next();
};
module.exports = {
  authorize,
  userOnly,
  adminOnly,
  regionalAdminOnly,
  superAdminOnly,
  mAdminOnly, // NEW
  regionalOrMAdminOnly, // NEW
  checkRegionalAccess,
  canManageUser,
  canManageCattle,
  checkOwnership
};