# Architecture Documentation

## Project Root
/media/runtime/DATA/fromD/Projects/working_final_cattel

---

## System Overview

Multi-tier cattle livestock management system with AI-powered cattle identification.
Three separate sub-projects share a single backend API:
1. A Node.js REST API (backend)
2. A React Native / Expo mobile app (farmers and regional admins)
3. A React web portal (M-Admins)

The AI component is a hosted HuggingFace Gradio app used for muzzle-print-based cattle recognition.

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express 4.x | HTTP framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT (jsonwebtoken) | Auth tokens (access + refresh) |
| bcryptjs | Password hashing |
| Multer | Multipart image uploads |
| Nodemailer | Email (OTP, notifications) |
| 2factor.in API | SMS OTP delivery (via built-in https module) |
| node-cron | Scheduled ML retry jobs |
| express-rate-limit | Rate limiting |
| express-validator | Input validation |
| helmet | HTTP security headers |
| morgan | Request logging |
| cors | Cross-origin resource sharing |
| form-data | Multipart payloads to ML service |
| exceljs | Export functionality |
| moment | Date handling |

### Mobile App (cattel_app)
| Technology | Purpose |
|------------|---------|
| React Native | Cross-platform UI |
| Expo / expo-router | Build tooling + file-based routing |
| Axios | HTTP client with interceptors |
| react-native-toast-message | User feedback toasts |

### Web Admin (m-admin-web)
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tooling |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| TailwindCSS | Utility-first styling |

### AI / ML
| Component | Detail |
|-----------|--------|
| Provider | HuggingFace Spaces (Gradio) |
| Base URL | https://pundareekaksh-cattle-id.hf.space |
| Method | POST multipart/form-data (actual image file) |
| Timeout | 30 s (ML_TIMEOUT_MS env var) |

---

## Directory Layout

```
/working_final_cattel/
│
├── cattle-identification-backend/
│   ├── server.js                       # App entry: starts HTTP server + cron jobs
│   ├── package.json
│   ├── .env                            # Environment variables
│   └── src/
│       ├── app.js                      # Express app: middleware, routes, error handler
│       ├── config/
│       │   ├── database.js             # Mongoose.connect() wrapper
│       │   └── email.js               # Nodemailer transporter factory
│       ├── models/
│       │   ├── User.js                 # Farmer/owner accounts
│       │   ├── Admin.js                # Regional / M-Admin / Super Admin accounts
│       │   ├── Cattle.js               # Livestock records with ML and verification state
│       │   ├── IdentificationRequest.js # Cattle ID requests with ML retry state
│       │   ├── Notification.js         # In-app notifications (90-day TTL)
│       │   └── TransferRequest.js      # Cattle ownership transfer records
│       ├── controllers/
│       │   ├── authController.js       # Signup, login, OTP, token refresh, logout
│       │   ├── cattleController.js     # Cattle CRUD + ML duplicate check + gallery add
│       │   ├── identificationController.js # ID request lifecycle + ML processing
│       │   ├── adminController.js      # Admin CRUD, verification queue, ML-failed cattle
│       │   ├── userController.js       # User profile, cattle view, transfers, notifications
│       │   └── locationController.js  # States/districts lookup (public)
│       ├── routes/
│       │   ├── authRoutes.js           # Mounted at /api/v1/auth
│       │   ├── cattleRoutes.js         # Mounted at /api/v1/cattle
│       │   ├── adminRoutes.js          # Mounted at /api/v1/admin
│       │   ├── userRoutes.js           # Mounted at /api/v1/users
│       │   └── locationRoutes.js       # Mounted at /api/v1/locations
│       ├── middlewares/
│       │   ├── authMiddleware.js       # protect(): JWT verify, attach req.user/req.admin
│       │   ├── roleMiddleware.js       # userOnly/adminOnly/mAdminOnly/superAdminOnly
│       │   ├── uploadMiddleware.js     # Multer: cattleUpload (14 fields), idUpload (4 fields)
│       │   └── errorMiddleware.js      # asyncHandler wrapper + global error handler
│       ├── utils/
│       │   ├── mlService.js            # HuggingFace API calls (predict, addUnknown, addKnown)
│       │   ├── emailService.js         # sendOTP, sendWelcome, sendPasswordReset etc.
│       │   ├── smsService.js           # 2factor.in SMS OTP delivery (sendOTP, sendLoginOTP, sendPasswordResetOTP)
│       │   └── tokenGenerator.js       # generateTokenPair(): { accessToken, refreshToken }
│       └── jobs/
│           └── mlRetryJob.js           # node-cron job: retries failed ML registrations + IDs
│
├── cattel_app/
│   ├── app.json / package.json
│   ├── app/
│   │   ├── _layout.tsx                 # Root layout, font loading, splash screen
│   │   ├── index.tsx                   # Entry redirect
│   │   ├── onboarding.tsx              # First-launch intro screens
│   │   ├── login.tsx                   # Farmer / admin login
│   │   ├── signup.tsx                  # Farmer registration (state/district dropdowns)
│   │   ├── (user)/                     # Farmer tab navigator
│   │   │   ├── _layout.tsx
│   │   │   ├── home.tsx                # Dashboard summary
│   │   │   ├── gallery.tsx             # Cattle gallery grid
│   │   │   ├── add.tsx                 # Register cattle (14-image upload form)
│   │   │   ├── identify.tsx            # Submit 4 images to identify cattle
│   │   │   ├── identification-status.tsx # Track identification request status
│   │   │   ├── notifications.tsx       # Notification inbox
│   │   │   ├── profile.tsx             # Account settings
│   │   │   └── cattle/[id].tsx         # Cattle detail view + ML status badge
│   │   ├── (regional-admin)/           # Regional admin screens
│   │   └── (super-admin)/             # Super admin screens
│   └── src/
│       ├── api/
│       │   ├── client.ts               # Axios instance, baseURL, interceptors, token refresh
│       │   └── endpoints/
│       │       ├── auth.ts             # login, signup, OTP calls
│       │       ├── cattle.ts           # cattle CRUD, identify, status
│       │       └── user.ts             # profile, notifications, transfers
│       ├── components/                 # Reusable UI: Button, Input, Card, ImageUploadGrid, etc.
│       ├── constants/                  # Colors, sizes, theme
│       ├── hooks/                      # Custom React hooks
│       └── store/ or context/          # State management
│
└── m-admin-web/
    ├── index.html / package.json / vite.config.js
    └── src/
        ├── main.jsx                    # React DOM render
        ├── App.jsx                     # Router configuration
        ├── context/
        │   └── AuthContext.jsx         # Admin auth state, login/logout
        ├── services/
        │   └── api.js                  # All axios calls for M-Admin web
        └── pages/
            ├── Login.jsx               # M-Admin login page
            ├── Dashboard.jsx           # Stats + pending cattle + ML-failed cattle
            ├── Verification.jsx        # Approve/reject individual cattle (image gallery)
            ├── VerificationHistory.jsx # History of verified cattle
            ├── IdentificationRequests.jsx     # Queue of pending ID requests
            ├── IdentificationVerification.jsx # Manual cattle matching UI
            ├── IdentificationHistory.jsx      # History of ID requests
            └── (shared components)/    # Navbar, Sidebar, etc.
```

---

## Request Lifecycle

```
Client (Mobile/Web)
  |
  v
Express app.js
  ├─ cors, helmet, morgan, express-rate-limit
  ├─ protect() [authMiddleware] - verifies JWT, populates req.user or req.admin
  ├─ roleMiddleware - checks role/jurisdiction
  ├─ uploadMiddleware (if multipart)
  ├─ Controller function
  │     ├─ Business logic
  │     ├─ ML calls (async, non-blocking via setImmediate)
  │     └─ Notification creation
  └─ Global error handler (errorMiddleware)
```

---

## Authentication Flow

```
POST /api/v1/auth/signup
  → hash password (bcrypt)
  → create User (mobileVerified=false)
  → generate OTP → send email (OTP_EXPIRE_MINUTES=10 min, skipRateLimit=true)
  → return { message: "OTP sent" }

POST /api/v1/auth/verify/mobile
  → validate OTP (10 min TTL, max 5 attempts)
  → set mobileVerified=true
  → generateTokenPair() → { accessToken (7d), refreshToken (30d) }
  → return tokens + user

POST /api/v1/auth/login  (password login)
  → find User by mobileNumber
  → comparePassword(bcrypt)
  → generateTokenPair()
  → return tokens + user

POST /api/v1/auth/login/otp/request  (OTP login step 1)
  → find User by mobileNumber
  → user.canRequestOTP():
       { allowed: false, reason: 'too_soon' }  → return otpAlreadySent:true + remainingSeconds
       { allowed: false, reason: 'rate_limit' } → return 429 + resetAt
       { allowed: true }  → continue
  → user.generateOTP() → send SMS via 2factor.in
  → return { otpSent: true, expiresAt }

POST /api/v1/auth/login/otp/verify  (OTP login step 2)
  → find User by mobileNumber
  → user.verifyOTP(code)  (10 min TTL, attempt limit)
  → generateTokenPair()
  → return tokens + user

POST /api/v1/auth/refresh-token
  → verify refreshToken (JWT_REFRESH_SECRET)
  → lookup User or Admin by decoded.id
  → generateTokenPair()
  → return new { accessToken, refreshToken }
```

### OTP Rate Limiting Rules
- Max **3 OTP sends** per user per **24-hour rolling window** (SMS only)
- OTP valid for **10 minutes** (OTP_EXPIRE_MINUTES env var)
- If valid OTP already exists (< 10 min old): return `otpAlreadySent: true` with `remainingSeconds` → frontend jumps to OTP input screen directly, no new SMS sent
- Email-change OTP flows use `skipRateLimit=true` and do NOT consume SMS quota
- Session persists for **7 days** (JWT_EXPIRE) until manual logout

---

## Scheduled Jobs (node-cron, every 30 min)

| Job | Trigger condition | Action |
|-----|-------------------|--------|
| runMLCattleRetryJob | Cattle.mlRegistration.status='in_progress' AND nextRetryAt <= now | Retry addUnknownCattle; escalate to M-Admin at count >= 4 |
| runMLIdentificationRetryJob | IdentificationRequest.status='pending' AND mlRetry.nextRetryAt <= now AND no escalatedAt | Retry ML predict; escalate to M-Admin at count >= 4 |

---

## Image Upload Configuration (Multer)

### Cattle Registration (14 images)
| Field name | Count | Description |
|------------|-------|-------------|
| muzzle | 3 | Close-up muzzle prints (ML primary input) |
| face | 3 | Face views |
| left | 3 | Left-side body |
| right | 3 | Right-side body |
| fullBodyLeft | 1 | Full body left |
| fullBodyRight | 1 | Full body right |

### Identification Request (4 images)
| Field name | Count | Description |
|------------|-------|-------------|
| front | 1 | Front/muzzle (ML primary input) |
| back | 1 | Back view |
| right | 1 | Right side |
| left | 1 | Left side |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | - | development / production |
| PORT | 8000 | HTTP server port |
| MONGODB_URI | - | MongoDB connection string |
| JWT_SECRET | - | Access token signing secret |
| JWT_EXPIRE | 7d | Access token TTL |
| JWT_REFRESH_SECRET | - | Refresh token signing secret |
| JWT_REFRESH_EXPIRE | 30d | Refresh token TTL |
| EMAIL_HOST | - | SMTP host |
| EMAIL_PORT | - | SMTP port |
| EMAIL_USER | - | SMTP username |
| EMAIL_PASSWORD | - | SMTP password |
| OTP_EXPIRE_MINUTES | 10 | OTP validity window |
| TWO_FACTOR_API_KEY | - | 2factor.in SMS gateway API key |
| ML_TIMEOUT_MS | 30000 | HuggingFace request timeout |
| VERIFICATION_TURNAROUND_HOURS | 48 | SLA for cattle verification |
| BASE_URL | - | Public server URL for image references |

---

## Jurisdiction / Access Control Summary

| Role | jurisdictionLevel | Data scope |
|------|-------------------|------------|
| super_admin | national | All data, no filters |
| m_admin | state / district / pincode | Filtered by assignedRegion |
| regional_admin | state / district / pincode | Filtered by assignedRegion (view only) |
| user (farmer) | - | Own cattle and requests only |

The roleMiddleware attaches jurisdiction filters to the query before the controller runs.
M-Admins are the ONLY role with write authority over cattle verification and identification decisions.
