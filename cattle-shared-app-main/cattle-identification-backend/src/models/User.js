const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema - Represents Farmers/Cattle Owners
 * Handles user authentication, profile management, and cattle ownership
 */
const userSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    // unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    // unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password in queries by default
  },
  
  // Profile Picture
  profilePicture: {
    filename: String,
    path: String,
    uploadedAt: Date
  },

  // Personal Details
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  occupation: {
    type: String,
    required: [true, 'Occupation is required'],
    trim: true
  },

  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Address
  address: {
    houseAndStreet: {
      type: String,
      required: [true, 'House and street address is required'],
      trim: true
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'India'
    },
    pinCode: {
      type: String,
      required: [true, 'Pin code is required'],
      trim: true,
      match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pin code']
    }
  },

  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,

  // OTP for mobile verification and login
  otp: {
    code: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },

  // OTP rate limiting — max 3 sends per 24-hour rolling window
  otpRateLimit: {
    count:       { type: Number, default: 0 }, // sends in current window
    windowStart: Date,                          // when the 24h window started
    lastSentAt:  Date                           // timestamp of most recent send
  },

  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // User Role (always 'user' for farmers)
  role: {
    type: String,
    enum: ['user'],
    default: 'user'
  },

  // Cattle owned by this user
cattle: {
  type: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cattle'
  }],
  default: []  // Add this line
},

  // Login tracking
  lastLogin: Date,
  loginHistory: [{
    loginAt: Date,
    ipAddress: String,
    userAgent: String
  }]

}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ mobileNumber: 1 });
userSchema.index({ 'address.district': 1, 'address.state': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
// Also tracks the 24-hour rate-limit window (max 3 sends).
// Pass skipRateLimit=true for non-SMS flows (e.g. email OTP after email change)
// so the daily SMS quota is not consumed.
userSchema.methods.generateOTP = function(skipRateLimit = false) {
  const now       = new Date();
  const WINDOW_MS = 24 * 60 * 60 * 1000;

  if (!skipRateLimit) {
    // Reset window counter if the 24h period has elapsed or window never started
    if (
      !this.otpRateLimit ||
      !this.otpRateLimit.windowStart ||
      (now - this.otpRateLimit.windowStart) >= WINDOW_MS
    ) {
      this.otpRateLimit = { count: 0, windowStart: now, lastSentAt: now };
    }

    this.otpRateLimit.count    += 1;
    this.otpRateLimit.lastSentAt = now;
  }

  const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
  const otp = Math.floor(
    Math.pow(10, otpLength - 1) + Math.random() * 9 * Math.pow(10, otpLength - 1)
  ).toString();

  this.otp = {
    code:      otp,
    expiresAt: new Date(Date.now() + (parseInt(process.env.OTP_EXPIRE_MINUTES) || 10) * 60 * 1000),
    attempts:  0
  };

  return otp;
};

// Check whether a new OTP send is permitted right now.
// Returns { allowed: true } or { allowed: false, reason, ...details }.
//
// Rules:
//   1. If an OTP was already sent and is still valid, return reason='too_soon'
//      so the client can jump straight to the OTP-input screen.
//   2. If 3 OTPs have already been sent within the last 24 hours, return
//      reason='rate_limit' with when the window resets.
userSchema.methods.canRequestOTP = function() {
  const now       = new Date();
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const MAX_OTP   = 3;

  // Rule 1 — active OTP still valid
  if (this.otp && this.otp.code && this.otp.expiresAt > now) {
    const remainingMs = this.otp.expiresAt - now;
    return {
      allowed:          false,
      reason:           'too_soon',
      remainingSeconds: Math.ceil(remainingMs / 1000),
      expiresAt:        this.otp.expiresAt
    };
  }

  // Rule 2 — 24h rate limit
  const rl = this.otpRateLimit;
  if (rl && rl.windowStart && (now - rl.windowStart) < WINDOW_MS && rl.count >= MAX_OTP) {
    const resetAt = new Date(rl.windowStart.getTime() + WINDOW_MS);
    return {
      allowed: false,
      reason:  'rate_limit',
      resetAt,
      message: `You have requested the maximum ${MAX_OTP} OTPs in 24 hours. Please try again after ${resetAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`
    };
  }

  return { allowed: true };
};

// Method to verify OTP
userSchema.methods.verifyOTP = function(candidateOTP) {
  if (!this.otp || !this.otp.code) {
    return { success: false, message: 'No OTP found' };
  }

  if (this.otp.expiresAt < new Date()) {
    return { success: false, message: 'OTP has expired' };
  }

  if (this.otp.attempts >= 3) {
    return { success: false, message: 'Maximum OTP attempts exceeded' };
  }

  if (this.otp.code === candidateOTP) {
    this.otp = undefined; // Clear OTP after successful verification
    return { success: true, message: 'OTP verified successfully' };
  }

  this.otp.attempts += 1;
  return { success: false, message: 'Invalid OTP' };
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);