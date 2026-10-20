const mongoose = require('mongoose');

/**
 * Cattle Schema - CORRECTED Verification Workflow
 * New Flow:
 * 1. User/Regional Admin/Super Admin submits → status: 'transit', verification.status: 'pending_verification'
 * 2. M_Admin (SECRET) compares with all cattle → Can 'approve' OR 'reject'
 * 3. Approved → status: 'active' | Rejected → remains 'transit' with reason
 * Note: M_Admin verification is hidden from users - they only see "pending verification"
 */
const cattleSchema = new mongoose.Schema({
  // System Generated Unique Cattle ID
  cattleId: {
    type: String,
    // unique: true,
    // required: true
  },

  // Owner Information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },

  // Basic Information
  breed: {
    type: String,
    required: [true, 'Breed is required'],
    trim: true
  },
  
  tagNo: {
    type: String,
    trim: true,
    default: null
  },

  medicalHistory: {
    type: String,
    trim: true,
    default: ''
  },

  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age cannot be negative']
  },

  color: {
    type: String,
    trim: true
  },

  type: {
    type: String,
    trim: true
  },

  // Images — 12 required: muzzle:5, face:5, fullBodyLeft:1, fullBodyRight:1.
  // left/right kept for older records; new regs store [].
  images: {
    muzzle: [{
      filename: { type: String, required: true },
      path: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      size: Number,
      mimetype: String
    }],
    face: [{
      filename: { type: String, required: true },
      path: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      size: Number,
      mimetype: String
    }],
    left: [{
      filename: { type: String, required: true },
      path: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      size: Number,
      mimetype: String
    }],
    right: [{
      filename: { type: String, required: true },
      path: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      size: Number,
      mimetype: String
    }],
    fullBodyLeft: [{
      filename: { type: String, required: true },
      path: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      size: Number,
      mimetype: String
    }],
    fullBodyRight: [{
      filename: { type: String, required: true },
      path: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      size: Number,
      mimetype: String
    }]
  },

  // Status: active, archive, transit
  status: {
    type: String,
    enum: ['active', 'archive', 'transit'],
    default: 'transit'
  },

  // SIMPLIFIED Verification - M_Admin ONLY (SECRET)
  verification: {
    status: {
      type: String,
      enum: [
        'pending_verification',    // Initial state - goes directly to M_Admin
        'approved',                // M_Admin approved
        'rejected'                 // M_Admin rejected
      ],
      default: 'pending_verification'
    },

    // M_Admin Verification (ONLY verification authority)
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'  // M_Admin who verified
    },
    verifiedAt: Date,
    rejectionReason: String,

    // Timing
    submittedAt: {
      type: Date,
      default: Date.now
    },
    turnaroundDeadline: {
      type: Date
    }
  },

  // Temporary ID before approval
  temporaryId: {
    type: String
  },

  // Duplicate detection
  isDuplicate: {
    type: Boolean,
    default: false
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cattle'
  },

  // Location
  location: {
    state: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true
    },
    pinCode: {
      type: String
    }
  },

  // Transfer/Ownership history
  transferHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransferRequest'
  }],

  // Archive information
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Identification/Verification attempts
  identificationHistory: [{
    identifiedAt: Date,
    identifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    method: {
      type: String,
      enum: ['image_scan', 'manual_search']
    }
  }],

  // ML Gallery Registration tracking
  mlRegistration: {
    // not_started: never tried | in_progress: retrying | registered: success
    // failed: all retries exhausted, manual_pending: handed to M-Admin
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'registered', 'failed', 'manual_pending'],
      default: 'not_started'
    },
    retryCount: { type: Number, default: 0 },
    lastRetryAt: Date,
    nextRetryAt: Date,
    registeredAt: Date
  }

}, {
  timestamps: true
});

// Indexes
cattleSchema.index({ cattleId: 1 });
cattleSchema.index({ owner: 1 });
cattleSchema.index({ status: 1 });
cattleSchema.index({ 'verification.status': 1 });
cattleSchema.index({ 'location.state': 1, 'location.district': 1 });
cattleSchema.index({ createdAt: -1 });

// Pre-save: Generate unique Cattle ID
cattleSchema.pre('save', async function(next) {
  if (this.isNew && !this.cattleId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.cattleId = `C${timestamp}${random}`;
    
    if (this.status === 'transit') {
      this.temporaryId = `TEMP-${this.cattleId}`;
    }
  }
  next();
});

// Pre-save: Set turnaround deadline (48 hours)
cattleSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'transit') {
    const turnaroundHours = parseInt(process.env.VERIFICATION_TURNAROUND_HOURS) || 48;
    this.verification.turnaroundDeadline = new Date(
      this.verification.submittedAt.getTime() + (turnaroundHours * 60 * 60 * 1000)
    );
  }
  next();
});

// Method for M_Admin to approve (ONLY M_Admin can approve)
cattleSchema.methods.approve = async function(mAdminId) {
  this.verification.status = 'approved';
  this.verification.verifiedBy = mAdminId;
  this.verification.verifiedAt = new Date();
  this.status = 'active';
  this.temporaryId = undefined;

  await this.save();
  return this;
};

// Method for M_Admin to reject (ONLY M_Admin can reject)
cattleSchema.methods.reject = async function(mAdminId, reason) {
  this.verification.status = 'rejected';
  this.verification.verifiedBy = mAdminId;
  this.verification.verifiedAt = new Date();
  this.verification.rejectionReason = reason;

  await this.save();
  return this;
};

// Method to archive cattle
cattleSchema.methods.archive = async function(userId) {
  this.status = 'archive';
  this.archivedAt = new Date();
  this.archivedBy = userId;
  
  await this.save();
  return this;
};

// Method to restore from archive
cattleSchema.methods.restore = async function() {
  if (this.verification.status === 'approved') {
    this.status = 'active';
  } else {
    this.status = 'transit';
  }
  this.archivedAt = undefined;
  this.archivedBy = undefined;
  
  await this.save();
  return this;
};

// Check if verification deadline exceeded
cattleSchema.methods.isVerificationOverdue = function() {
  if (this.verification.status === 'pending_verification' && this.verification.turnaroundDeadline) {
    return new Date() > this.verification.turnaroundDeadline;
  }
  return false;
};

// Virtual to get total image count
cattleSchema.virtual('totalImages').get(function() {
  if (!this.images) return 0;
  
  return (
    (this.images.muzzle?.length || 0) +
    (this.images.face?.length || 0) +
    (this.images.left?.length || 0) +
    (this.images.right?.length || 0) +
    (this.images.fullBodyLeft?.length || 0) +
    (this.images.fullBodyRight?.length || 0)
  );
});

cattleSchema.set('toJSON', { virtuals: true });
cattleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cattle', cattleSchema);