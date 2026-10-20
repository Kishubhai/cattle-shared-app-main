const { 
  uploadCattleImages, 
  uploadSingleProfile, 
  validateCattleImages,
  deleteUploadedFiles 
} = require('../config/multer');


const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Upload Middleware Wrapper
 * Adds error handling to multer uploads
 */

/**
 * Handle cattle image upload with validation
 */
const handleCattleImageUpload = (req, res, next) => {
  uploadCattleImages(req, res, (err) => {
    if (err) {
      // Delete any uploaded files if error occurs
      if (req.files) {
        deleteUploadedFiles(req.files);
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading images'
      });
    }

    // Validate image count (12 images required)
    const validation = validateCattleImages(req.files);

    if (!validation.valid) {
      // Delete uploaded files if validation fails
      deleteUploadedFiles(req.files);

      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors
      });
    }

    next();
  });
};

/**
 * Handle profile picture upload
 */
const handleProfileUpload = (req, res, next) => {
  uploadSingleProfile(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading profile picture'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a profile picture'
      });
    }

    next();
  });
};

/**
 * Optional profile picture upload (doesn't fail if no file)
 */
const handleOptionalProfileUpload = (req, res, next) => {
  uploadSingleProfile(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading profile picture'
      });
    }

    // Parse JSON fields from FormData
    if (req.body.address && typeof req.body.address === 'string') {
      try {
        req.body.address = JSON.parse(req.body.address);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    if (req.body.location && typeof req.body.location === 'string') {
      try {
        req.body.location = JSON.parse(req.body.location);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    // Handle location coordinates sent as separate fields
    if (req.body['location.coordinates[0]'] && req.body['location.coordinates[1]']) {
      req.body.location = {
        coordinates: [
          parseFloat(req.body['location.coordinates[0]']),
          parseFloat(req.body['location.coordinates[1]'])
        ]
      };
    }

    // Continue even if no file uploaded
    next();
  });
};





// ADD THIS CODE TO YOUR EXISTING uploadMiddleware.js

const identificationStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'identification');
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `identify-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const identificationFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, and PNG images are allowed for identification'), false);
  }
};

const uploadIdentification = multer({
  storage: identificationStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: identificationFileFilter
});

const handleIdentificationImageUpload = (req, res, next) => {
  const upload = uploadIdentification.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
    { name: 'right', maxCount: 1 },
    { name: 'left', maxCount: 1 }
  ]);

  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'FILE_UPLOAD_ERROR'
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'FILE_UPLOAD_ERROR'
      });
    }

    // Validate that all 4 images are uploaded
    if (!req.files || !req.files.front || !req.files.back || !req.files.right || !req.files.left) {
      // Clean up any uploaded files
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: 'All 4 images are required: front, back, right, and left views of the cattle',
        error: 'INCOMPLETE_IMAGES'
      });
    }

    next();
  });
};




module.exports = {
  handleCattleImageUpload,
  handleProfileUpload,
  handleOptionalProfileUpload,
  handleIdentificationImageUpload
};