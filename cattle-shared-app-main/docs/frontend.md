# Frontend Documentation

---

## 1. Mobile App (cattel_app)

**Location:** `/media/runtime/DATA/fromD/Projects/working_final_cattel/cattel_app/`
**Framework:** React Native + Expo (expo-router for file-based routing)

### API Client Setup
**File:** `src/api/client.ts`

```typescript
// Axios instance configuration
const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach access token from secure storage
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 → refresh token → retry
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // call GET /auth/refresh-token
      // store new accessToken
      // retry original request
    }
    return Promise.reject(error);
  }
);
```

### API Endpoint Modules
**Directory:** `src/api/endpoints/`

| File | Calls |
|------|-------|
| auth.ts | login (password), signup, verifyMobile, requestLoginOTP, verifyLoginOTP, resendOTP, forgotPassword, resetPassword, logout, refreshToken |
| cattle.ts | registerCattle, getMyCattle, getCattle, getCattleById, identify, getIdentificationRequests, cancelIdentification, archiveCattle, restoreCattle, transferCattle |
| user.ts | getProfile, updateProfile, uploadProfilePicture, changePassword, getNotifications, markNotificationRead, markAllRead, getTransferRequests, acceptTransfer, rejectTransfer, cancelTransfer |

---

### Screen Index

#### Public / Auth Screens
**Directory:** `app/`

| File | Route | Purpose |
|------|-------|---------|
| onboarding.tsx | /onboarding | First-launch animated intro slides |
| login.tsx | /login | Email + password login for farmers and admins |
| signup.tsx | /signup | Farmer registration: name, email, password, address (state/district dropdowns populated from /api/v1/locations/states) |

**Signup state/district flow:**
1. On mount, fetch `GET /api/v1/locations/states` → populate state Picker
2. On state selection, fetch `GET /api/v1/locations/states/:state/districts` → populate district Picker
3. Submit form → `POST /api/v1/auth/signup` → navigate to OTP verification screen

**OTP Login flow (mobile number):**
1. User enters mobile number → `POST /api/v1/auth/login/otp/request`
2. If response contains `otpAlreadySent: true` → navigate directly to OTP input screen, show "OTP already sent, expires in {remainingSeconds}s"
3. If response is 429 → show "Too many OTP requests, try again after {resetAt}"
4. Otherwise → navigate to OTP input screen (OTP sent via SMS)
5. On OTP submit → `POST /api/v1/auth/login/otp/verify` → store tokens → navigate to home

**Token Refresh (Axios interceptor):**
- On 401 response: call `POST /api/v1/auth/refresh-token` with stored refreshToken
- On success: store new tokens, retry original request
- On failure (expired/invalid refresh token): clear storage, redirect to login

---

#### Farmer Screens
**Directory:** `app/(user)/`
**Layout:** Tab navigator (home, gallery, add, identify, notifications, profile)

| File | Tab/Route | Purpose |
|------|-----------|---------|
| _layout.tsx | - | Tab bar config, auth guard |
| home.tsx | Home | Dashboard: cattle count summary, recent notifications, quick actions |
| gallery.tsx | Gallery | Grid of farmer's cattle cards. Filter by status (active/archive/transit). |
| add.tsx | Add | 14-image upload form for cattle registration |
| identify.tsx | Identify | 4-image upload form for identification request |
| identification-status.tsx | (modal/stack) | List and track identification requests |
| notifications.tsx | Notifications | Paginated notification inbox with read/unread state |
| profile.tsx | Profile | Account settings: edit profile, change password, deactivate account |
| cattle/[id].tsx | (stack) | Cattle detail: all images, verification badge, ML registration status badge, transfer history |

#### add.tsx — Cattle Registration Screen (14 images)
```
Fields:
  - ImageUploadGrid component:
      muzzle (3 slots)
      face (3 slots)
      left side (3 slots)
      right side (3 slots)
      full body left (1 slot)
      full body right (1 slot)
  - Text inputs: breed (required), age (required), color, type, tag number
  - Textarea: medical history
  - Location: state (dropdown), district (dropdown), pinCode

On submit:
  - Validate required fields and minimum images
  - Build FormData with all image files and metadata
  - POST /api/v1/cattle/register (multipart)
  - Show loading indicator
  - On 409: show "Cattle already registered" alert
  - On 201: navigate to gallery with success toast
```

#### identify.tsx — Identification Request Screen (4 images)
```
Fields:
  - ImageUploadGrid: front, back, right, left (1 each)
  - Optional: location (GPS or manual address)

On submit:
  - Build FormData with 4 images
  - POST /api/v1/cattle/identify (multipart)
  - On 201: navigate to identification-status with success toast
  - User will receive push/in-app notification when result is ready
```

#### cattle/[id].tsx — Cattle Detail Screen
```
Sections:
  1. Image carousel (swipeable, grouped by category)
  2. Cattle info card: breed, age, color, type, tag number
  3. Verification status badge:
     - pending_verification → yellow "Pending"
     - approved → green "Approved"
     - rejected → red "Rejected" (+ rejection reason)
  4. ML Registration status badge:
     - not_started / in_progress → gray "Registering in AI..."
     - registered → green "AI Registered"
     - manual_pending → orange "AI Registration Pending (Manual)"
  5. Transfer/sell button (only if status='active' and verification='approved')
  6. Archive/restore button
  7. Transfer history list
```

#### identification-status.tsx — Identification Requests List
```
List of IdentificationRequest cards:
  - requestId, submittedAt, status badge
  - If completed + found: links to matched cattle
  - If pending: shows "Processing..." with retry count info
  - Cancel button (only for pending requests)

Status badge colors:
  pending → blue
  processing → yellow
  completed + found → green
  completed + not found → gray
  failed → red
  cancelled → gray strikethrough
```

---

#### Regional Admin Screens
**Directory:** `app/(regional-admin)/`

| File | Purpose |
|------|---------|
| home.tsx | Regional dashboard: farmer count, cattle count in jurisdiction |
| farmers.tsx | List farmers in jurisdiction |
| cattle.tsx | List cattle in jurisdiction (view only) |
| profile.tsx | Admin profile |

---

#### Super Admin Screens
**Directory:** `app/(super-admin)/`

| File | Purpose |
|------|---------|
| home.tsx | Global dashboard |
| admins.tsx | List all admins, approve/deactivate |
| farmers.tsx | List all farmers |
| cattle.tsx | All cattle globally |
| profile.tsx | Admin profile |

---

### Shared Components
**Directory:** `src/components/`

| Component | Purpose |
|-----------|---------|
| Button | Primary/secondary/danger variants, loading state |
| Input | Text input with label, error display, password toggle |
| Card | Generic card container with shadow |
| ImageUploadGrid | Grid of image slots; tap to pick from camera/gallery; shows preview |
| StatusBadge | Color-coded status pill (verification, ML, identification) |
| NotificationItem | Single notification row with type icon and read/unread styling |
| CattleCard | Cattle summary card for gallery grid (image thumbnail, breed, status) |
| LoadingOverlay | Full-screen spinner for async operations |
| ToastProvider | react-native-toast-message wrapper |

---

## 2. M-Admin Web Portal (m-admin-web)

**Location:** `/media/runtime/DATA/fromD/Projects/working_final_cattel/m-admin-web/`
**Framework:** React 18 + Vite + React Router v6 + TailwindCSS

### Auth Context
**File:** `src/context/AuthContext.jsx`

```javascript
// Provides: { admin, token, login, logout, isAuthenticated }
// Stores token in localStorage
// Attaches token to all axios requests via default header
// login() calls POST /api/v1/auth/admin/login
// logout() clears localStorage, redirects to /login
```

### API Service
**File:** `src/services/api.js`

```javascript
// Axios instance with:
//   baseURL: import.meta.env.VITE_API_URL
//   Authorization header from localStorage token
//   Response interceptor: 401 → redirect to /login

// Exported functions:
// - getDashboard()
// - getPendingCattle()
// - getCattleForVerification(id)
// - approveCattle(id)
// - rejectCattle(id, reason)
// - getMLFailedCattle()
// - triggerMLRegistration(id)
// - getPendingIdentification()
// - getIdentificationRequest(id)
// - getFarmerCattle(requestId)
// - startIdentificationProcessing(id)
// - completeIdentification(id, data)
// - failIdentification(id, message)
// - getVerificationHistory(filters)
// - getIdentificationHistory(filters)
// - getNotifications(params)
// - markNotificationRead(id)
// - markAllNotificationsRead()
```

---

### Page Index

#### Login.jsx
**Route:** `/login`

```
Fields: email, password
On submit: POST /api/v1/auth/admin/login
On success: store token in AuthContext → redirect to /dashboard
On fail: show error message
```

---

#### Dashboard.jsx
**Route:** `/dashboard`
**API:** `GET /api/v1/admin/dashboard`

```
Sections:

1. Stats Cards Row:
   - Pending Verifications (count)
   - Total Approved Cattle
   - Total Rejected Cattle
   - Pending Identification Requests

2. Pending Cattle Verification Table:
   - Columns: cattleId, farmer name, breed, submitted date, turnaround deadline, overdue flag
   - Click row → navigate to /verification/:id
   - Sorted by submittedAt ASC (oldest first)

3. AI Registration Failed Section (ML-failed cattle):
   - Only shows if mlRegistration.status = 'manual_pending' cattle exist in jurisdiction
   - Columns: cattleId, farmer, breed, retry count, last attempt
   - "Register in AI" button → POST /api/v1/admin/m-admin/cattle/:id/register-ml
   - Shows success/error toast

4. Notifications bell icon in navbar:
   - Unread count badge
   - Dropdown with recent notifications (type icons: urgent notifications highlighted)
```

---

#### Verification.jsx
**Route:** `/verification/:id`
**API:** `GET /api/v1/admin/m-admin/cattle/:id/verify`

```
Purpose: M-Admin reviews a single cattle record and approves or rejects it.

Layout:
  Left panel — Image Gallery:
    - Category tabs: Muzzle, Face, Left, Right, Full Body Left, Full Body Right
    - Image grid per category (3 columns for most, 1 for full body)
    - Lightbox on click
    - Total image count per category

  Right panel — Cattle Information:
    - cattleId, temporaryId
    - Farmer: name, email, mobile
    - Breed, age, color, type, tag number
    - Medical history
    - Location: state, district, pinCode
    - Submitted date + turnaround deadline + overdue warning (red if past)
    - ML Registration status badge

  Action Bar (bottom or top right):
    - [Approve] button → PUT /api/v1/admin/m-admin/cattle/:id/approve
        Shows confirmation modal → success → navigate to /dashboard
    - [Reject] button → opens Reject Modal:
        Textarea: rejection reason (required, min 10 chars)
        [Submit Rejection] → PUT /api/v1/admin/m-admin/cattle/:id/reject { reason }
        → success → navigate to /dashboard

  Duplicate Warning Banner:
    - If cattle.isDuplicate = true: "Warning: This cattle was flagged as potential duplicate of {duplicateOf}"
```

---

#### VerificationHistory.jsx
**Route:** `/verification-history`
**API:** `GET /api/v1/admin/m-admin/verification-history`

```
Filters:
  - Date range: from, to
  - Status: approved, rejected, all
  - Search by cattleId or farmer name

Table columns:
  - cattleId, farmer, breed, status (badge), verifiedAt, verifiedBy (admin name), rejection reason (if rejected)

Actions:
  - Click row → expand details
  - [Update Decision] button → PUT /api/v1/admin/m-admin/verification-history/:id
    (allows correcting a previous approve/reject decision)

Pagination: page, limit controls
```

---

#### IdentificationRequests.jsx
**Route:** `/identification`
**API:** `GET /api/v1/admin/m-admin/identification/pending`

```
Purpose: Queue of identification requests awaiting manual M-Admin processing
(requests where mlRetry.escalatedAt is set)

Table columns:
  - requestId, farmer name, submitted date, mlRetry.count, priority badge, status badge

Sorted by: escalatedAt ASC (escalated longest ago first), then by priority

Click row → navigate to /identification/:id

Priority badges:
  high → red
  normal → blue
  low → gray
  (urgent mlRetry notifications show orange border on row)
```

---

#### IdentificationVerification.jsx
**Route:** `/identification/:id`
**API:**
- `GET /api/v1/admin/m-admin/identification/:id`
- `GET /api/v1/admin/m-admin/identification/:id/farmer-cattle`

```
Purpose: M-Admin manually matches or rejects an identification request.

Layout:
  Top — Request Images:
    - 4 images (front, back, right, left) in a 2x2 grid
    - Lightbox on click
    - requestId, submitted date, mlRetry.count, escalatedAt

  Middle — Farmer's Registered Cattle:
    - Grid of cattle cards from /farmer-cattle endpoint
    - Each card: muzzle thumbnail, cattleId, breed, age, verification status
    - Click cattle card → select as match (highlights with green border)
    - Search/filter by cattleId or breed

  Bottom — Actions:
    [Start Processing] → PUT /api/v1/admin/m-admin/identification/:id/start
      (locks request for this admin, sets status='processing')

    If selected cattle match:
    [Complete - Found] → PUT /api/v1/admin/m-admin/identification/:id/complete
      Body: { found: true, cattleId: selectedCattle.cattleId, confidence, message }

    If no match found:
    [Complete - Not Found] → PUT /api/v1/admin/m-admin/identification/:id/complete
      Body: { found: false, message: "No matching cattle found" }

    [Mark as Failed] → opens modal with message textarea →
      PUT /api/v1/admin/m-admin/identification/:id/fail

    All actions → navigate back to /identification on success
    → User receives notification automatically via backend
```

---

#### IdentificationHistory.jsx
**Route:** `/identification-history`
**API:** `GET /api/v1/admin/m-admin/identification-history`

```
Filters:
  - Date range: from, to
  - Status: completed, failed, all
  - Found / not found toggle
  - Search by requestId or farmer name

Table columns:
  - requestId, farmer, status badge, found (yes/no), cattleId (if found), completedAt, processedBy

Actions:
  - Click row → expand details (shows all 4 request images, result, notes)
  - [Update Decision] → PUT /api/v1/admin/m-admin/identification-history/:id

Pagination
```

---

### M-Admin Web — Navigation Structure

```
Sidebar / Navbar:
  - Dashboard          →  /dashboard
  - Verification       →  /verification (list pending)
  - Verification History →  /verification-history
  - Identification Requests →  /identification
  - Identification History →  /identification-history
  - Notifications (bell icon with badge)
  - Logout
```

---

### M-Admin Web — Key UI Patterns

#### Notification Handling
- On login: fetch unread count → display badge on bell icon
- Bell dropdown: last 10 notifications, color-coded by priority
- Urgent (orange): ml_registration_failed, ml_identification_failed
- High (red): verification_overdue
- Medium (blue): standard cattle/identification notifications
- Click notification → navigate to relevant page (actionUrl) + mark as read

#### Overdue Indicators
- Verification table rows with turnaroundDeadline < now highlighted in red
- Dashboard card shows separate "Overdue" count

#### ML Registration Failed Dashboard Section
- Only visible when ml-failed-cattle count > 0
- Each row: cattle info + "Register in AI" button
- Button shows spinner during API call
- Success: row disappears (no longer manual_pending)
- Fail: shows error message with retry option

#### Image Comparison (Verification.jsx)
- Tab-based navigation through image categories
- M-Admin can open images in full-screen lightbox to compare muzzle prints
- All 14 uploaded images accessible per category

---

### Environment Variables

#### Mobile App (cattel_app)
```
EXPO_PUBLIC_API_URL=http://<backend-host>:8000/api/v1
```

#### Web Admin (m-admin-web)
```
VITE_API_URL=http://<backend-host>:8000/api/v1
```
