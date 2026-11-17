const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

/**
 * Face + muzzle ML service (mlapp).
 *
 *   POST /identify    face_image + muzzle_image  → duplicate check and identification
 *   POST /register    cattle_id + both images    → enroll a new cow in both galleries
 *   POST /add_images  cattle_id + either image   → store extra photos
 *
 * /identify uses both models and returns the same fields the app already expects:
 *   { decision, is_known, max_similarity, best_match, rule }
 */

const ML_BASE_URL = (
  process.env.ML_URL ||
  process.env.ML_BASE_URL ||
  process.env.ML_SERVER_URL ||
  ''
).trim();
const ML_API_KEY = (process.env.ML_API_KEY || '').trim();
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS, 10) || 30000;

const mlPost = (endpoint, form) => {
  if (!ML_BASE_URL) {
    console.warn('[ML Service] ML_URL is empty; skipping', endpoint);
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let responseData = '';
    let settled = false;

    const settle = (value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }
    };

    let url;
    try {
      url = new URL(endpoint, ML_BASE_URL.endsWith('/') ? ML_BASE_URL : `${ML_BASE_URL}/`);
    } catch (err) {
      console.error('[ML Service] Invalid ML_URL:', err.message);
      settle(null);
      return;
    }

    const lib = url.protocol === 'https:' ? https : http;
    const headers = form.getHeaders();
    if (ML_API_KEY) headers['X-API-Key'] = ML_API_KEY;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers
      },
      (res) => {
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 400) {
            console.error(`[ML Service] ${endpoint} HTTP ${res.statusCode}:`, responseData.slice(0, 300));
            settle(null);
            return;
          }
          try {
            settle(JSON.parse(responseData));
          } catch (err) {
            console.error(`[ML Service] Could not parse ${endpoint}:`, responseData.slice(0, 200));
            settle(null);
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error(`[ML Service] Network error on ${endpoint}:`, err.message);
      settle(null);
    });

    const timer = setTimeout(() => {
      console.log(`[ML Service] Timeout (${ML_TIMEOUT_MS}ms) on ${endpoint}`);
      req.destroy();
      settle(null);
    }, ML_TIMEOUT_MS);

    form.pipe(req);
  });
};

const fileOk = (filePath) => Boolean(filePath) && fs.existsSync(filePath);

const appendImage = (form, field, filePath) => {
  form.append(field, fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: 'image/jpeg'
  });
};

const describeMatch = (result) => {
  if (!result || result.is_known !== true) {
    return 'No matching cattle found in the registry';
  }
  const score = result.max_similarity != null
    ? `${(result.max_similarity * 100).toFixed(1)}%`
    : 'n/a';
  const rule = result.rule ? ` via ${result.rule}` : '';
  return `Matched cattle ${result.best_match} (similarity: ${score}${rule})`;
};

/**
 * Ask both models whether this face + muzzle pair is already enrolled.
 * Muzzle is optional; the face photo is required by /identify.
 */
const identifyCattle = async (facePath, muzzlePath) => {
  if (!fileOk(facePath)) {
    console.error('[ML Service] identifyCattle: face image not found at', facePath);
    return null;
  }
  try {
    const form = new FormData();
    appendImage(form, 'face_image', facePath);
    if (fileOk(muzzlePath)) appendImage(form, 'muzzle_image', muzzlePath);
    console.log(`[ML Service] /identify → face=${path.basename(facePath)} muzzle=${fileOk(muzzlePath) ? path.basename(muzzlePath) : 'none'}`);
    const result = await mlPost('/identify', form);
    if (result) {
      console.log(`[ML Service] /identify result: decision=${result.decision}, rule=${result.rule}, similarity=${result.max_similarity}`);
    }
    return result;
  } catch (err) {
    console.error('[ML Service] identifyCattle error:', err.message);
    return null;
  }
};

/**
 * Enroll a new cow in both galleries. Both photos are required.
 * Returns { status: 'added' | 'review_required' | 'rejected', ... } or null.
 * review_required and rejected mean the photos were not written to the gallery.
 */
const enrollCattle = async (facePath, muzzlePath, cattleId) => {
  if (!fileOk(facePath) || !fileOk(muzzlePath)) {
    console.error('[ML Service] enrollCattle: face and muzzle images are both required', cattleId);
    return null;
  }
  try {
    const form = new FormData();
    form.append('cattle_id', cattleId);
    appendImage(form, 'face_image', facePath);
    appendImage(form, 'muzzle_image', muzzlePath);
    console.log(`[ML Service] /register → cattleId=${cattleId}`);
    const result = await mlPost('/register', form);
    if (result) console.log(`[ML Service] /register result: status=${result.status}`);
    return result;
  } catch (err) {
    console.error('[ML Service] enrollCattle error:', err.message);
    return null;
  }
};

/**
 * Store extra face and/or muzzle photos for a cow already in the galleries.
 */
const addGalleryImages = async (cattleId, facePath, muzzlePath) => {
  if (!fileOk(facePath) && !fileOk(muzzlePath)) return null;
  try {
    const form = new FormData();
    form.append('cattle_id', cattleId);
    if (fileOk(facePath)) appendImage(form, 'face_image', facePath);
    if (fileOk(muzzlePath)) appendImage(form, 'muzzle_image', muzzlePath);
    return await mlPost('/add_images', form);
  } catch (err) {
    console.error('[ML Service] addGalleryImages error:', err.message);
    return null;
  }
};

/**
 * After the first pair is enrolled, add the remaining face and muzzle photos.
 * A failure here does not undo the enrollment.
 */
const enrollExtraImages = async (cattleId, facePaths = [], muzzlePaths = []) => {
  const faces = facePaths.filter(fileOk);
  const muzzles = muzzlePaths.filter(fileOk);
  const count = Math.max(faces.length, muzzles.length);
  for (let i = 0; i < count; i += 1) {
    const added = await addGalleryImages(cattleId, faces[i], muzzles[i]);
    if (!added) {
      console.warn(`[ML Service] Extra image ${i + 1} was not stored for ${cattleId}`);
    }
  }
};

/**
 * Identification screen: front = face section A, right = muzzle section A.
 */
const callMLModel = async (identificationRequest) => {
  const facePath = identificationRequest.images?.front?.path;
  const muzzlePath = identificationRequest.images?.right?.path;
  const result = await identifyCattle(facePath, muzzlePath);
  if (!result) return null;

  return {
    success: true,
    found: result.is_known === true,
    confidence: result.max_similarity != null ? Math.round(result.max_similarity * 100) : null,
    cattleId: result.best_match || null,
    rule: result.rule || null,
    message: describeMatch(result)
  };
};

module.exports = {
  identifyCattle,
  needsAdminReview: (mlResult) =>
    Boolean(mlResult && (mlResult.status === 'review_required' || mlResult.status === 'rejected')),
  enrollCattle,
  addGalleryImages,
  enrollExtraImages,
  callMLModel
};
