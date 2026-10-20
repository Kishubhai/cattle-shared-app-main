const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

/**
 * ML Service - HuggingFace Cattle Identification API
 * Base URL: https://pundareekaksh-cattle-id.hf.space
 *
 * Endpoints:
 *   GET  /health        → health check
 *   POST /predict       → check if cattle already exists in gallery (send image)
 *   POST /add_unknown   → add NEW cattle to gallery (send image + cattle_id)
 *   POST /add_known     → add extra image for EXISTING cattle (send image + cattle_id)
 *
 * /predict response:
 *   { decision: 'KNOWN'|'UNKNOWN', is_known: bool, max_similarity: float,
 *     best_match: string|null, top_matches: [...], ... }
 *
 * /add_unknown response:
 *   { status: 'added', cattle_id: string, gallery_size: int, message: string }
 *
 * /add_known response:
 *   { status: 'updated', cattle_id: string, num_images: int, message: string }
 */

const ML_BASE_URL = 'https://pundareekaksh-cattle-id.hf.space';
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS) || 30000;

/**
 * Internal: POST multipart form-data to ML server
 * @param {string} endpoint - e.g. '/predict'
 * @param {FormData} form
 * @returns {object|null}
 */
const mlPost = (endpoint, form) => {
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

    const headers = form.getHeaders();

    const options = {
      hostname: 'pundareekaksh-cattle-id.hf.space',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers
    };

    const req = https.request(options, (res) => {
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          settle(result);
        } catch (e) {
          console.error(`[ML Service] Could not parse response from ${endpoint}:`, responseData.slice(0, 200));
          settle(null);
        }
      });
    });

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

/**
 * Check if a cattle already exists in the ML gallery.
 * Used BEFORE registering new cattle - if KNOWN, reject duplicate.
 * Also used for cattle identification requests.
 *
 * @param {string} imagePath - Absolute path to image file on disk
 * @returns {object|null}
 *   Success: { decision: 'KNOWN'|'UNKNOWN', is_known: bool, max_similarity: float,
 *              best_match: string|null (cattleId), ... }
 *   Failure: null
 */
const predictCattle = async (imagePath) => {
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.error('[ML Service] predictCattle: image not found at', imagePath);
    return null;
  }
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    console.log(`[ML Service] /predict → ${path.basename(imagePath)}`);
    const result = await mlPost('/predict', form);
    if (result) console.log(`[ML Service] /predict result: decision=${result.decision}, similarity=${result.max_similarity}`);
    return result;
  } catch (e) {
    console.error('[ML Service] predictCattle error:', e.message);
    return null;
  }
};

/**
 * Register a NEW cattle in the ML gallery.
 * Called after a new cattle is created in DB (if not duplicate).
 *
 * @param {string} imagePath - Absolute path to image file
 * @param {string} cattleId  - System-generated cattle ID (e.g. C123456789)
 * @returns {object|null}
 *   Success: { status: 'added', cattle_id, gallery_size, message }
 *   Failure: null
 */
const addUnknownCattle = async (imagePath, cattleId) => {
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.error('[ML Service] addUnknownCattle: image not found at', imagePath);
    return null;
  }
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('cattle_id', cattleId);
    console.log(`[ML Service] /add_unknown → cattleId=${cattleId}`);
    const result = await mlPost('/add_unknown', form);
    if (result) console.log(`[ML Service] /add_unknown result: status=${result.status}, gallery_size=${result.gallery_size}`);
    return result;
  } catch (e) {
    console.error('[ML Service] addUnknownCattle error:', e.message);
    return null;
  }
};

/**
 * Add an additional image to an EXISTING cattle class in the ML gallery.
 * Updates the mean embedding for that cattle.
 *
 * @param {string} imagePath - Absolute path to image file
 * @param {string} cattleId  - Existing cattle ID already in gallery
 * @returns {object|null}
 */
const addKnownCattle = async (imagePath, cattleId) => {
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.error('[ML Service] addKnownCattle: image not found at', imagePath);
    return null;
  }
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('cattle_id', cattleId);
    console.log(`[ML Service] /add_known → cattleId=${cattleId}`);
    const result = await mlPost('/add_known', form);
    if (result) console.log(`[ML Service] /add_known result: status=${result.status}, num_images=${result.num_images}`);
    return result;
  } catch (e) {
    console.error('[ML Service] addKnownCattle error:', e.message);
    return null;
  }
};

/**
 * Run ML prediction for an identification request.
 * Uses the front image and translates HuggingFace response to our internal format.
 *
 * @param {object} identificationRequest - IdentificationRequest document
 * @returns {object|null}
 *   Success: { success: true, found: bool, confidence: number|null,
 *              cattleId: string|null, message: string }
 *   Failure: null
 */
const callMLModel = async (identificationRequest) => {
  const imagePath = identificationRequest.images?.front?.path;

  if (!imagePath) {
    console.error('[ML Service] callMLModel: no front image path on request', identificationRequest._id);
    return null;
  }

  const result = await predictCattle(imagePath);
  if (!result) return null;

  return {
    success: true,
    found: result.is_known === true,
    confidence: result.max_similarity != null ? Math.round(result.max_similarity * 100) : null,
    cattleId: result.best_match || null,   // This is the cattle's cattleId string (e.g. C123456789)
    message: result.is_known
      ? `Matched cattle ${result.best_match} (similarity: ${(result.max_similarity * 100).toFixed(1)}%)`
      : 'No matching cattle found in the registry'
  };
};

module.exports = { predictCattle, addUnknownCattle, addKnownCattle, callMLModel };
