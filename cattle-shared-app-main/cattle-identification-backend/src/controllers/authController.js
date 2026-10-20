const User = require('../models/User');
const Admin = require('../models/Admin');
const { generateTokenPair } = require('../utils/tokenGenerator');
const { generateOTP } = require('../utils/otpGenerator');
const emailService = require('../utils/emailService');
const smsService = require('../utils/smsService');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * Authentication Controller
 * Handles user and admin authentication (signup, login, OTP, password reset)
 * Following the document: Login options - Standard, OTP, Email
 */

// ========== USER AUTHENTICATION ==========

/**
 * @desc    Register new user (Farmer)
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
const userSignup = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    mobileNumber,
    password,
    dateOfBirth,
    occupation,
    address,
    location
  } = req.body;

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

  // Handle profile picture if uploaded
  let profilePicture = null;
  if (req.file) {
    profilePicture = {
      filename: req.file.filename,
      path: req.file.path,
      uploadedAt: new Date()
    };
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
    profilePicture,
    location: location ? {
      type: 'Point',
      coordinates: location.coordinates // [longitude, latitude]
    } : undefined
  });

  // Generate OTP for mobile verification
  const otp = user.generateOTP();
  await user.save();

  // Send OTP via SMS
  await smsService.sendOTP(mobileNumber, otp);

  // Send email verification (optional, OTP is primary)
  await emailService.sendOTP(email, `${firstName} ${lastName}`, otp);

  // Generate tokens
  const tokens = generateTokenPair({
    id: user._id,
    role: user.role
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please verify your mobile number with the OTP sent.',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified
      },
      tokens
    }
  });
});

/**
 * @desc    User login with mobile number and password
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const userLogin = asyncHandler(async (req, res) => {
  const { mobileNumber, password } = req.body;

  // Find user and include password
  const user = await User.findOne({ mobileNumber }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid mobile number or password'
    });
  }

  // Check if password matches
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid mobile number or password'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Please contact support.'
    });
  }

  // Update last login
  user.lastLogin = new Date();
  user.loginHistory.push({
    loginAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  await user.save();

  // Generate tokens
  const tokens = generateTokenPair({
    id: user._id,
    role: user.role
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified,
        profilePicture: user.profilePicture
      },
      tokens
    }
  });
});

/**
 * @desc    Request OTP for login (Login by OTP)
 * @route   POST /api/v1/auth/login/otp/request
 * @access  Public
 */
const requestLoginOTP = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;

  const user = await User.findOne({ mobileNumber });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No account found with this mobile number'
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Please contact support.'
    });
  }

  // --- Guard: rate limit & duplicate-send check ---
  const check = user.canRequestOTP();

  if (!check.allowed) {
    if (check.reason === 'too_soon') {
      // An OTP is already live — tell the client to skip straight to OTP input.
      // The app should NOT send another SMS; just navigate to the verify screen.
      return res.status(200).json({
        success:        true,
        otpAlreadySent: true,
        message:        'OTP already sent. Please check your phone.',
        data: {
          mobileNumber,
          remainingSeconds: check.remainingSeconds,
          expiresAt:        check.expiresAt,
          expiresIn:        `${Math.ceil(check.remainingSeconds / 60)} minute(s)`
        }
      });
    }

    // rate_limit — 3 OTPs exhausted in this 24h window
    return res.status(429).json({
      success: false,
      message: check.message,
      data:    { resetAt: check.resetAt }
    });
  }

  // Generate and send fresh OTP
  const otp = user.generateOTP();
  await user.save();
  await smsService.sendLoginOTP(mobileNumber, otp);

  res.status(200).json({
    success:        true,
    otpAlreadySent: false,
    message:        'OTP sent to your mobile number',
    data: {
      mobileNumber,
      expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 10} minutes`
    }
  });
});

/**
 * @desc    Verify OTP and login
 * @route   POST /api/v1/auth/login/otp/verify
 * @access  Public
 */
const verifyLoginOTP = asyncHandler(async (req, res) => {
  const { mobileNumber, otp } = req.body;

  // Find user
  const user = await User.findOne({ mobileNumber });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No account found with this mobile number'
    });
  }

  // Verify OTP
  const verification = user.verifyOTP(otp);

  if (!verification.success) {
    await user.save(); // Save attempt count
    return res.status(400).json({
      success: false,
      message: verification.message
    });
  }

  // Mark mobile as verified if not already
  if (!user.isMobileVerified) {
    user.isMobileVerified = true;
  }

  // Update last login
  user.lastLogin = new Date();
  user.loginHistory.push({
    loginAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  await user.save();

  // Generate tokens
  const tokens = generateTokenPair({
    id: user._id,
    role: user.role
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified,
        profilePicture: user.profilePicture
      },
      tokens
    }
  });
});

/**
 * @desc    Verify mobile number with OTP (after signup)
 * @route   POST /api/v1/auth/verify/mobile
 * @access  Public
 */
const verifyMobile = asyncHandler(async (req, res) => {
  const { mobileNumber, otp } = req.body;

  const user = await User.findOne({ mobileNumber });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify OTP
  const verification = user.verifyOTP(otp);

  if (!verification.success) {
    await user.save();
    return res.status(400).json({
      success: false,
      message: verification.message
    });
  }

  // Mark as verified
  user.isMobileVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Mobile number verified successfully'
  });
});

/**
 * @desc    Resend OTP
 * @route   POST /api/v1/auth/resend-otp
 * @access  Public
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;

  const user = await User.findOne({ mobileNumber });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // --- Guard: rate limit & duplicate-send check ---
  const check = user.canRequestOTP();

  if (!check.allowed) {
    if (check.reason === 'too_soon') {
      return res.status(200).json({
        success:        true,
        otpAlreadySent: true,
        message:        'Your previous OTP is still valid. Please use it.',
        data: {
          mobileNumber,
          remainingSeconds: check.remainingSeconds,
          expiresAt:        check.expiresAt,
          expiresIn:        `${Math.ceil(check.remainingSeconds / 60)} minute(s)`
        }
      });
    }

    return res.status(429).json({
      success: false,
      message: check.message,
      data:    { resetAt: check.resetAt }
    });
  }

  const otp = user.generateOTP();
  await user.save();
  await smsService.sendOTP(mobileNumber, otp);

  res.status(200).json({
    success:        true,
    otpAlreadySent: false,
    message:        'OTP sent successfully',
    data: {
      mobileNumber,
      expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 10} minutes`
    }
  });
});

/**
 * @desc    Forgot password - Request OTP
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;

  const user = await User.findOne({ mobileNumber });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No account found with this mobile number'
    });
  }

  // --- Guard: rate limit & duplicate-send check ---
  const check = user.canRequestOTP();

  if (!check.allowed) {
    if (check.reason === 'too_soon') {
      // OTP already in flight — caller can jump to OTP input
      return res.status(200).json({
        success:        true,
        otpAlreadySent: true,
        message:        'An OTP was already sent recently. Please use that to reset your password.',
        data: {
          mobileNumber,
          remainingSeconds: check.remainingSeconds,
          expiresAt:        check.expiresAt,
          expiresIn:        `${Math.ceil(check.remainingSeconds / 60)} minute(s)`
        }
      });
    }

    return res.status(429).json({
      success: false,
      message: check.message,
      data:    { resetAt: check.resetAt }
    });
  }

  const otp = user.generateOTP();
  await user.save();
  await smsService.sendPasswordResetOTP(mobileNumber, otp);

  res.status(200).json({
    success:        true,
    otpAlreadySent: false,
    message:        'Password reset OTP sent to your mobile number',
    data: {
      mobileNumber,
      expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 10} minutes`
    }
  });
});

/**
 * @desc    Reset password with OTP
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { mobileNumber, otp, password } = req.body;

  const user = await User.findOne({ mobileNumber });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify OTP
  const verification = user.verifyOTP(otp);

  if (!verification.success) {
    await user.save();
    return res.status(400).json({
      success: false,
      message: verification.message
    });
  }

  // Set new password
  user.password = password;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully. You can now login with your new password.'
  });
});

// ========== ADMIN AUTHENTICATION ==========

/**
 * @desc    Admin login (Regional Admin and Super Admin)
 * @route   POST /api/v1/auth/admin/login
 * @access  Public
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  // Find admin and include password
  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check password
  const isPasswordMatch = await admin.comparePassword(password);

  if (!isPasswordMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check if admin is active
  if (!admin.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your admin account has been deactivated'
    });
  }

  // Check if regional admin is approved
  if (admin.role === 'regional_admin' && !admin.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Your admin account is pending approval from Super Admin'
    });
  }

  // Update last login
  admin.lastLogin = new Date();
  admin.loginHistory.push({
    loginAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  await admin.save();

  // Generate tokens
  const tokens = generateTokenPair({
    id: admin._id,
    role: admin.role
  });

  res.status(200).json({
    success: true,
    message: 'Admin login successful',
    data: {
      admin: {
        id: admin._id,
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        mobileNumber: admin.mobileNumber,
        role: admin.role,
        jurisdictionLevel: admin.jurisdictionLevel,
        assignedRegion: admin.assignedRegion,
        isApproved: admin.isApproved,
        isActive: admin.isActive,
        statistics: admin.statistics
      },
      tokens
    }
  });
});

/**
 * @desc    Admin login with OTP
 * @route   POST /api/v1/auth/admin/login/otp/request
 * @access  Public
 */
const requestAdminLoginOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const admin = await Admin.findOne({ email });

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'No admin account found with this email'
    });
  }

  if (!admin.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your admin account has been deactivated'
    });
  }

  if (admin.role === 'regional_admin' && !admin.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Your admin account is pending approval'
    });
  }

  // Generate OTP
  const otp = admin.generateOTP();
  await admin.save();

  // Send OTP via email
  await emailService.sendOTP(email, `${admin.firstName} ${admin.lastName}`, otp);

  res.status(200).json({
    success: true,
    message: 'OTP sent to your email address',
    data: {
      email,
      expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 10} minutes`
    }
  });
});

/**
 * @desc    Verify admin OTP and login
 * @route   POST /api/v1/auth/admin/login/otp/verify
 * @access  Public
 */
const verifyAdminLoginOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const admin = await Admin.findOne({ email });

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found'
    });
  }

  // Verify OTP
  const verification = admin.verifyOTP(otp);

  if (!verification.success) {
    await admin.save();
    return res.status(400).json({
      success: false,
      message: verification.message
    });
  }

  // Update last login
  admin.lastLogin = new Date();
  admin.loginHistory.push({
    loginAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  await admin.save();

  // Generate tokens
  const tokens = generateTokenPair({
    id: admin._id,
    role: admin.role
  });

  res.status(200).json({
    success: true,
    message: 'Admin login successful',
    data: {
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        assignedRegion: admin.assignedRegion
      },
      tokens
    }
  });
});

/**
 * @desc    Refresh access token using a valid refresh token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (requires valid refreshToken in body)
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token is required' });
  }

  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token. Please login again.' });
  }

  // Find the account
  let account = null;
  if (decoded.role === 'user') {
    account = await User.findById(decoded.id);
    if (!account || !account.isActive) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }
  } else {
    account = await Admin.findById(decoded.id);
    if (!account || !account.isActive) {
      return res.status(401).json({ success: false, message: 'Admin account not found or deactivated.' });
    }
  }

  // Issue new token pair
  const tokens = generateTokenPair({ id: account._id, role: account.role });

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { tokens }
  });
});

/**
 * @desc    Get current logged in user/admin
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  let userData;

  if (req.userType === 'user') {
    userData = await User.findById(req.user._id).populate('cattle');
  } else if (req.userType === 'admin') {
    userData = await Admin.findById(req.user._id);
  }

  res.status(200).json({
    success: true,
    data: userData
  });
});

/**
 * @desc    Logout user/admin
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // In JWT, logout is handled on client side by removing token
  // Here we can add token to blacklist if needed (future enhancement)

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = {
  // User Authentication
  userSignup,
  userLogin,
  requestLoginOTP,
  verifyLoginOTP,
  verifyMobile,
  resendOTP,
  forgotPassword,
  resetPassword,

  // Admin Authentication
  adminLogin,
  requestAdminLoginOTP,
  verifyAdminLoginOTP,

  // Common
  refreshToken,
  getMe,
  logout
};