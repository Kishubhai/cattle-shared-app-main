/**
 * Cattel App — Centralized Error Handler
 *
 * Every error shown to the user carries a code.
 * When a user reports an error, the code tells the developer
 * exactly what went wrong without any guessing.
 *
 * Code ranges:
 *   NET-xxx  → Network / connectivity errors
 *   AUTH-xxx → Authentication / session errors
 *   VAL-xxx  → Validation / bad input errors
 *   IMG-xxx  → Image / camera / gallery errors
 *   CAT-xxx  → Cattle business logic errors
 *   ML-xxx   → AI / ML model errors
 *   SRV-xxx  → Server / infrastructure errors
 */

export interface AppError {
  code: string;
  title: string;
  message: string;
}

// ─── Error Catalog ────────────────────────────────────────────────────────────

export const ERROR_CATALOG: Record<string, AppError> = {

  // ── Network ──────────────────────────────────────────────────────────────
  'NET-001': {
    code: 'NET-001',
    title: 'Request Timed Out',
    message: 'The request took too long. Your connection may be slow or the server is busy.',
  },
  'NET-002': {
    code: 'NET-002',
    title: 'Cannot Reach Server',
    message:
      'Wi‑Fi may be connected, but the app could not reach the cattle server. ' +
      'Try again on a stronger network, or confirm the backend is online.',
  },
  'NET-003': {
    code: 'NET-003',
    title: 'Upload Too Large',
    message: 'One or more images exceed the server size limit. Try retaking photos at lower resolution.',
  },

  // ── Authentication ────────────────────────────────────────────────────────
  'AUTH-001': {
    code: 'AUTH-001',
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again.',
  },
  'AUTH-002': {
    code: 'AUTH-002',
    title: 'Invalid Credentials',
    message: 'The mobile number or password you entered is incorrect.',
  },
  'AUTH-003': {
    code: 'AUTH-003',
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.',
  },
  'AUTH-004': {
    code: 'AUTH-004',
    title: 'Account Not Found',
    message: 'No account found with these details. Please sign up first.',
  },
  'AUTH-005': {
    code: 'AUTH-005',
    title: 'OTP Expired',
    message: 'The OTP has expired. Please request a new one.',
  },
  'AUTH-006': {
    code: 'AUTH-006',
    title: 'Invalid OTP',
    message: 'The OTP you entered is incorrect. Please check and try again.',
  },

  // ── Validation ───────────────────────────────────────────────────────────
  'VAL-001': {
    code: 'VAL-001',
    title: 'Images Not Received',
    message: 'Server did not receive all 12 required images (5 muzzle, 5 face, 1 full body left, 1 full body right). Please try again.',
  },
  'VAL-002': {
    code: 'VAL-002',
    title: 'Invalid Fields',
    message: 'One or more fields contain invalid data. Please review and correct them.',
  },
  'VAL-003': {
    code: 'VAL-003',
    title: 'File Too Large',
    message: 'One or more images are too large. Maximum allowed size is 5 MB per image.',
  },
  'VAL-004': {
    code: 'VAL-004',
    title: 'Too Many Files',
    message: 'More files were sent than the server accepts. Please try again.',
  },

  // ── Image / Camera ────────────────────────────────────────────────────────
  'IMG-001': {
    code: 'IMG-001',
    title: 'Camera Permission Denied',
    message: 'Camera access is blocked. Go to device Settings → Apps → Cattel → Permissions and allow Camera.',
  },
  'IMG-002': {
    code: 'IMG-002',
    title: 'Gallery Permission Denied',
    message: 'Photo library access is blocked. Go to device Settings → Apps → Cattel → Permissions and allow Storage.',
  },
  'IMG-003': {
    code: 'IMG-003',
    title: 'Image Load Failed',
    message: 'Could not open the image. The file may be corrupted. Please try a different photo.',
  },

  // ── Cattle ────────────────────────────────────────────────────────────────
  'CAT-001': {
    code: 'CAT-001',
    title: 'Cattle Not Found',
    message: 'The cattle record was not found. It may have been deleted.',
  },
  'CAT-002': {
    code: 'CAT-002',
    title: 'Already Archived',
    message: 'This cattle is already in the archive.',
  },
  'CAT-003': {
    code: 'CAT-003',
    title: 'Pending Transfer',
    message: 'A transfer request is pending for this cattle. Cancel the transfer first.',
  },
  'CAT-004': {
    code: 'CAT-004',
    title: 'Duplicate Cattle',
    message: 'AI system detected this cattle is already registered in the system. Duplicate registration is not allowed.',
  },
  'CAT-005': {
    code: 'CAT-005',
    title: 'Tag Number Taken',
    message: 'This tag number is already assigned to another cattle. Use a different tag number.',
  },
  'CAT-006': {
    code: 'CAT-006',
    title: 'Registration Failed',
    message: 'Cattle registration failed on the server. Please try again.',
  },

  // ── ML / AI Model ─────────────────────────────────────────────────────────
  'ML-001': {
    code: 'ML-001',
    title: 'AI Model Unavailable',
    message: 'The AI verification service is currently offline. Your registration was accepted and will be reviewed manually.',
  },
  'ML-002': {
    code: 'ML-002',
    title: 'AI Detected Duplicate',
    message: 'AI identified this cattle as already registered. If this is wrong, contact support.',
  },
  'ML-003': {
    code: 'ML-003',
    title: 'AI: No Match Found',
    message: 'The AI could not match these photos to any registered cattle.',
  },
  'ML-004': {
    code: 'ML-004',
    title: 'AI Service Error',
    message: 'The AI identification service returned an error. Please try again or contact support.',
  },

  // ── Server ────────────────────────────────────────────────────────────────
  'SRV-001': {
    code: 'SRV-001',
    title: 'Server Error',
    message: 'An unexpected error occurred on the server. Please try again in a moment.',
  },
  'SRV-002': {
    code: 'SRV-002',
    title: 'Server Unavailable',
    message: 'The server is temporarily down for maintenance. Please try again later.',
  },
  'SRV-099': {
    code: 'SRV-099',
    title: 'Unknown Error',
    message: 'An unexpected error occurred. Please try again or contact support if it persists.',
  },
};

// ─── Toast format ─────────────────────────────────────────────────────────────
/**
 * Converts an AppError to toast-ready { text1, text2 } props.
 * The error code is appended to text2 so users can report it precisely.
 */
export function toToast(appError: AppError): { text1: string; text2: string } {
  return {
    text1: appError.title,
    text2: `${appError.message}  [${appError.code}]`,
  };
}

// ─── Core detection logic ─────────────────────────────────────────────────────
/**
 * Inspects an Axios error and returns the most precise AppError for the situation.
 *
 * @param error - Axios error (or any caught error)
 * @param context - What operation was happening when the error occurred
 */
export function detectError(
  error: any,
  context:
    | 'register_cattle'
    | 'identify_cattle'
    | 'login'
    | 'signup'
    | 'otp'
    | 'password_reset'
    | 'upload_image'
    | 'load_data'
    | 'general' = 'general'
): AppError {
  // ── 1. Network-level errors (no HTTP response) ──────────────────────────
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    if (context === 'register_cattle') {
      return {
        ...ERROR_CATALOG['NET-001'],
        message:
          'Uploading 12 images timed out. Your connection may be too slow. ' +
          'Try on Wi-Fi or a faster network.  [NET-001]',
        code: 'NET-001',
      };
    }
    return ERROR_CATALOG['NET-001'];
  }

  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return ERROR_CATALOG['NET-002'];
  }

  const status: number = error?.response?.status ?? 0;
  const serverMsg: string = error?.response?.data?.message ?? '';
  const serverData: any = error?.response?.data ?? {};

  // ── 2. HTTP status-based errors ─────────────────────────────────────────

  // 413 Payload Too Large
  if (status === 413) return ERROR_CATALOG['NET-003'];

  // 401 Unauthorized
  if (status === 401) return ERROR_CATALOG['AUTH-001'];

  // 403 Forbidden
  if (status === 403) return ERROR_CATALOG['AUTH-003'];

  // 404 Not Found
  if (status === 404) {
    if (context === 'login' || context === 'signup') return ERROR_CATALOG['AUTH-004'];
    if (context === 'register_cattle' || context === 'identify_cattle') return ERROR_CATALOG['CAT-001'];
    return { ...ERROR_CATALOG['SRV-099'], message: `Resource not found.  [SRV-099]` };
  }

  // 409 Conflict — always means duplicate cattle from ML
  if (status === 409) {
    const matchId = serverData?.data?.matchedCattleId;
    const similarity = serverData?.data?.similarity;
    let msg =
      'AI detected this cattle is already registered in the system. Duplicate registration is not allowed.';
    if (matchId) msg += ` Matched ID: ${matchId}.`;
    if (similarity != null) msg += ` Similarity: ${Math.round(similarity * 100)}%.`;
    return { ...ERROR_CATALOG['CAT-004'], message: `${msg}  [CAT-004]` };
  }

  // 400 Bad Request — parse what went wrong
  if (status === 400) {
    const lowerMsg = serverMsg.toLowerCase();

    // Multer: file too large
    if (lowerMsg.includes('file too large') || lowerMsg.includes('maximum size')) {
      return ERROR_CATALOG['VAL-003'];
    }
    // Multer: too many files
    if (lowerMsg.includes('too many files')) {
      return ERROR_CATALOG['VAL-004'];
    }
    // Missing images
    if (lowerMsg.includes('upload all required images') || lowerMsg.includes('12 total') || lowerMsg.includes('14 total')) {
      return ERROR_CATALOG['VAL-001'];
    }
    // Duplicate key (tag number)
    if (lowerMsg.includes('tagno') || lowerMsg.includes('tag number') || lowerMsg.includes('already exists')) {
      return ERROR_CATALOG['CAT-005'];
    }
    // Validation errors list from server
    if (Array.isArray(serverData?.errors) && serverData.errors.length > 0) {
      const fieldErrors = serverData.errors.map((e: any) => e.message || e.field).join(', ');
      return {
        ...ERROR_CATALOG['VAL-002'],
        message: `${fieldErrors}  [VAL-002]`,
      };
    }
    // Generic 400 with server message
    if (serverMsg) {
      return { ...ERROR_CATALOG['VAL-002'], message: `${serverMsg}  [VAL-002]` };
    }
    return ERROR_CATALOG['VAL-002'];
  }

  // 500 Internal Server Error
  if (status === 500) return ERROR_CATALOG['SRV-001'];

  // 503 Service Unavailable
  if (status === 503) return ERROR_CATALOG['SRV-002'];

  // Any other 5xx
  if (status >= 500) {
    return {
      ...ERROR_CATALOG['SRV-001'],
      message: `Server error (HTTP ${status}). Please try again.  [SRV-001]`,
    };
  }

  // ── 3. Server returned a message but we didn't classify it above ─────────
  if (serverMsg) {
    return { ...ERROR_CATALOG['SRV-099'], message: `${serverMsg}  [SRV-099]` };
  }

  // ── 4. Complete fallback ─────────────────────────────────────────────────
  return ERROR_CATALOG['SRV-099'];
}

/**
 * Quick helper — detects error and returns toast-ready { text1, text2 }.
 */
export function getErrorToast(
  error: any,
  context: Parameters<typeof detectError>[1] = 'general'
): { text1: string; text2: string } {
  const appError = detectError(error, context);
  return toToast(appError);
}

/**
 * Legacy helper kept for backward compatibility.
 * Prefer getErrorToast() for new code.
 */
export function getApiErrorMessage(
  error: any,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Request timed out. Check your internet and try again.';
  }
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return 'Cannot reach server. Check your internet connection.';
  }
  if (error?.response?.data?.message) return error.response.data.message;
  if (Array.isArray(error?.response?.data?.errors) && error.response.data.errors.length > 0) {
    return error.response.data.errors.map((e: any) => e.message || e.field || String(e)).join(', ');
  }
  const s = error?.response?.status;
  if (s === 401) return 'Session expired. Please log in again.';
  if (s === 403) return 'You do not have permission for this action.';
  if (s === 404) return 'Requested resource not found.';
  if (s >= 500) return `Server error (${s}). Please try again later.`;
  return fallback;
}
