import { Alert } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';

export type ImageQualityResult = {
  ok: boolean;
  score: number;
  brightness: number;
  reason?: 'blurry' | 'too_dark' | 'too_bright' | 'decode_failed';
  message?: string;
};

/** Laplacian variance below this = blurry (tuned for phone cattle photos). */
const BLUR_THRESHOLD = 120;
/** Mean grayscale brightness bounds (0–255). */
const MIN_BRIGHTNESS = 35;
const MAX_BRIGHTNESS = 230;

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const atobFn = (globalThis as { atob?: (s: string) => string }).atob;

  if (typeof atobFn === 'function') {
    const binary = atobFn(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Minimal fallback if atob is unavailable
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const enc1 = chars.indexOf(clean[i]);
    const enc2 = chars.indexOf(clean[i + 1]);
    const enc3 = chars.indexOf(clean[i + 2]);
    const enc4 = chars.indexOf(clean[i + 3]);
    const bitmap = (enc1 << 18) | (enc2 << 12) | ((enc3 & 63) << 6) | (enc4 & 63);
    bytes.push((bitmap >> 16) & 255);
    if (clean[i + 2] !== '=') bytes.push((bitmap >> 8) & 255);
    if (clean[i + 3] !== '=') bytes.push(bitmap & 255);
  }
  return Uint8Array.from(bytes);
}

/**
 * Laplacian variance sharpness score on a downscaled grayscale image.
 * Higher = sharper.
 */
function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const lap =
        -gray[i - width] -
        gray[i - 1] +
        4 * gray[i] -
        gray[i + 1] -
        gray[i + width];
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/**
 * Check whether an image URI is sharp and well-lit enough for cattle registration / identify.
 */
export async function checkImageQuality(uri: string): Promise<ImageQualityResult> {
  try {
    // Downscale for fast on-device analysis
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 240 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: false }
    );

    const base64 = await readAsStringAsync(resized.uri, {
      encoding: EncodingType.Base64,
    });

    const raw = jpeg.decode(base64ToUint8Array(base64), { useTArray: true });
    const { data, width, height } = raw;

    const gray = new Float32Array(width * height);
    let brightnessSum = 0;

    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[p] = g;
      brightnessSum += g;
    }

    const brightness = brightnessSum / (width * height);
    const score = laplacianVariance(gray, width, height);

    if (brightness < MIN_BRIGHTNESS) {
      return {
        ok: false,
        score,
        brightness,
        reason: 'too_dark',
        message:
          'Image is too dark. Retake in better lighting so facial and muzzle details are clear.',
      };
    }

    if (brightness > MAX_BRIGHTNESS) {
      return {
        ok: false,
        score,
        brightness,
        reason: 'too_bright',
        message: 'Image is overexposed. Retake without harsh direct light or glare.',
      };
    }

    if (score < BLUR_THRESHOLD) {
      return {
        ok: false,
        score,
        brightness,
        reason: 'blurry',
        message:
          'Image looks blurry. Hold the phone steady, ensure focus, and retake a clearer photo.',
      };
    }

    return { ok: true, score, brightness };
  } catch (error) {
    console.warn('[imageQuality] check failed, allowing image:', error);
    // Fail open so a decode glitch does not block registration entirely
    return {
      ok: true,
      score: -1,
      brightness: -1,
      reason: 'decode_failed',
    };
  }
}

/**
 * Resize + compress a photo before multipart upload so 12 images
 * can finish on weak Wi‑Fi without the request dying mid-transfer.
 */
export async function prepareImageForUpload(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

/**
 * If the image fails quality checks, show an alert with Retake.
 * Returns true when the image is acceptable.
 */
export async function ensureImageQuality(
  uri: string,
  onRetake: () => void
): Promise<boolean> {
  const result = await checkImageQuality(uri);
  if (result.ok) return true;

  Alert.alert(
    result.reason === 'blurry' ? 'Image Too Blurry' : 'Image Quality Issue',
    result.message || 'Please retake a clearer photo.',
    [
      { text: 'Retake', onPress: onRetake },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
  return false;
}
