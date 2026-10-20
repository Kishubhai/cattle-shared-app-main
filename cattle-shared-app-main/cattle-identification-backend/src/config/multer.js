const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create base upload directories
const uploadBasePath = path.join(__dirname, '../uploads');
ensureDirectoryExists(uploadBasePath);
ensureDirectoryExists(path.join(uploadBasePath, 'profiles'));
ensureDirectoryExists(path.join(uploadBasePath, 'cattle'));
ensureDirectoryExists(path.join(uploadBasePath, 'cattle/muzzle'));
ensureDirectoryExists(path.join(uploadBasePath, 'cattle/face'));
ensureDirectoryExists(path.join(uploadBasePath, 'cattle/left'));
ensureDirectoryExists(path.join(uploadBasePath, 'cattle/right'));
ensureDirectoryExists(path.join(uploadBasePath, 'cattle/fullBodyLeft'));
ensureDirectoryExists(path.join(uploadBasePath, 'cattle/fullBodyRight'));

// Storage configuration for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for cattle images
const cattleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get image category from fieldname (muzzle, face, left, right, fullBodyLeft, fullBodyRight)
    const category = file.fieldname;
    const uploadPath = path.join(__dirname, `../uploads/cattle/${category}`);
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const category = file.fieldname;
    cb(null, `${category}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only images
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Max file size from env (default 5MB)
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// Multer upload for profile pictures
const uploadProfile = multer({
  storage: profileStorage,
  limits: {
    fileSize: maxFileSize
  },
  fileFilter: imageFileFilter
});

// Multer upload for cattle images
// Exactly 12 images: muzzle(5), face(5), fullBodyLeft(1), fullBodyRight(1)
const uploadCattle = multer({
  storage: cattleStorage,
  limits: {
    fileSize: maxFileSize,
    files: 12
  },
  fileFilter: imageFileFilter
});

const cattleImageFields = [
  { name: 'muzzle', maxCount: 5 },
  { name: 'face', maxCount: 5 },
  { name: 'fullBodyLeft', maxCount: 1 },
  { name: 'fullBodyRight', maxCount: 1 }
];

const uploadCattleImages = uploadCattle.fields(cattleImageFields);

const uploadSingleProfile = uploadProfile.single('profilePicture');

const deleteUploadedFiles = (files) => {
  if (!files) return;

  if (Array.isArray(files)) {
    files.forEach(file => {
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  } else if (typeof files === 'object') {
    Object.keys(files).forEach(key => {
      if (Array.isArray(files[key])) {
        files[key].forEach(file => {
          if (file && file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    });
  } else if (files && files.path && fs.existsSync(files.path)) {
    fs.unlinkSync(files.path);
  }
};

const validateCattleImages = (files) => {
  if (!files) {
    return { valid: false, message: 'No images uploaded' };
  }

  const muzzleCount = files.muzzle ? files.muzzle.length : 0;
  const faceCount = files.face ? files.face.length : 0;
  const fullBodyLeftCount = files.fullBodyLeft ? files.fullBodyLeft.length : 0;
  const fullBodyRightCount = files.fullBodyRight ? files.fullBodyRight.length : 0;

  const errors = [];

  if (muzzleCount !== 5) {
    errors.push(`Muzzle images: ${muzzleCount}/5 (exactly 5 required)`);
  }
  if (faceCount !== 5) {
    errors.push(`Face images: ${faceCount}/5 (exactly 5 required)`);
  }
  if (fullBodyLeftCount !== 1) {
    errors.push(`Full body left image: ${fullBodyLeftCount}/1 (exactly 1 required)`);
  }
  if (fullBodyRightCount !== 1) {
    errors.push(`Full body right image: ${fullBodyRightCount}/1 (exactly 1 required)`);
  }

  const totalImages = muzzleCount + faceCount + fullBodyLeftCount + fullBodyRightCount;

  if (totalImages !== 12) {
    errors.push(`Total images: ${totalImages}/12 (exactly 12 required)`);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      message: 'Invalid image count',
      errors: errors
    };
  }

  return { valid: true, message: 'All images validated successfully' };
};

module.exports = {
  uploadProfile,
  uploadCattle,
  uploadCattleImages,
  uploadSingleProfile,
  cattleImageFields,
  deleteUploadedFiles,
  validateCattleImages,
  ensureDirectoryExists
};
