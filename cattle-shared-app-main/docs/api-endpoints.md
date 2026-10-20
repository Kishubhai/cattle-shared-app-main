# API Endpoints Documentation

Base URL: `https://cattlebackend.kalpanahardware.in/api/v1`

## Auth / Access Legend
| Symbol | Meaning |
|--------|---------|
| PUBLIC | No authentication required |
| protect | Valid JWT access token required (Authorization: Bearer <token>) |
| userOnly | protect + role must be 'user' (farmer) |
| adminOnly | protect + role must be any admin role |
| mAdminOnly | protect + role must be 'm_admin' |
| superAdminOnly | protect + role must be 'super_admin' |

---

## Auth Routes — /api/v1/auth
File: `src/routes/authRoutes.js`
Controller: `src/controllers/authController.js`

### User Authentication

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /signup | PUBLIC | Farmer registration. Body: firstName, lastName, email, mobileNumber, password, confirmPassword, dateOfBirth, occupation, address (houseAndStreet, district, state, country, pinCode). Sends email OTP to verify mobile. |
| POST | /login | PUBLIC | Farmer password login. Body: mobileNumber, password. Returns accessToken + refreshToken (7d / 30d). |
| POST | /login/otp/request | PUBLIC | Request SMS OTP for login. Body: mobileNumber. Enforces rate limit (max 3/24h). If valid OTP still active: returns `{ otpAlreadySent: true, remainingSeconds, expiresAt }` — frontend should jump to OTP input, no SMS sent. Returns 429 if daily limit reached. |
| POST | /login/otp/verify | PUBLIC | Verify SMS OTP and log in. Body: mobileNumber, otp. Returns accessToken + refreshToken on success. |
| POST | /verify/mobile | PUBLIC | Verify mobile number after signup. Body: mobileNumber, otp. Sets mobileVerified=true. |
| POST | /resend-otp | PUBLIC | Re-send OTP. Body: mobileNumber. Same rate-limit guard as /login/otp/request. |
| POST | /forgot-password | PUBLIC | Send password reset OTP via SMS. Body: mobileNumber. Rate-limit guarded. |
| POST | /reset-password | PUBLIC | Reset password with OTP. Body: mobileNumber, otp, password, confirmPassword. |

### Admin Authentication

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /admin/login | PUBLIC | Admin login. Body: email, password. Returns tokens. |
| POST | /admin/login/otp/request | PUBLIC | Request OTP for admin login. Body: mobileNumber. |
| POST | /admin/login/otp/verify | PUBLIC | Verify OTP and complete admin login. Body: mobileNumber, otp. |

### Common Routes

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /me | protect | Get current logged-in user or admin profile. |
| POST | /logout | protect | Log out. Clears session. |
| POST | /refresh-token | PUBLIC | Issue new token pair using a valid refresh token. Body: refreshToken. Returns new accessToken + refreshToken. Validates against JWT_REFRESH_SECRET and checks account isActive. |

---

## Cattle Routes — /api/v1/cattle
File: `src/routes/cattleRoutes.js`
Controller: `src/controllers/cattleController.js` (cattle ops)
Controller: `src/controllers/identificationController.js` (identification ops, mounted here)

All routes require `protect` middleware minimum.

### Cattle CRUD

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /register | userOnly | Register new cattle. Multipart: 14 image fields (muzzle[3], face[3], left[3], right[3], fullBodyLeft[1], fullBodyRight[1]) + metadata fields. Triggers ML duplicate check → create Cattle → ML gallery add (async). |
| GET | / | protect | List cattle. Farmers see own; regional admin sees jurisdiction; super_admin sees all. Supports query filters. |
| GET | /my | userOnly | Current user's cattle only. Supports status filter. |
| GET | /statistics | protect | Cattle statistics grouped by status, verification status, breed, and location. |
| POST | /search-by-image | adminOnly | Placeholder for image-based search (not fully implemented). |
| GET | /:id | protect | Single cattle record. Includes images, verification, mlRegistration, identificationHistory. |
| GET | /:id/images/:category | protect | Images for a category (muzzle, face, left, right, fullBodyLeft, fullBodyRight). |
| PUT | /:id/archive | userOnly | Archive cattle (owner only). Sets status='archive'. **Blocked (400) if a pending transfer exists — cancel the transfer first.** |
| PUT | /:id/restore | userOnly | Restore cattle from archive (owner only). |
| DELETE | /:id | userOnly | Permanently delete cattle record (owner only, only if not approved). **Blocked (400) if a pending transfer exists — cancel the transfer first.** |
| POST | /:id/transfer | userOnly | Initiate ownership transfer. Body: toOwnerId, transferType, transferDetails. Creates TransferRequest. **Returns 400 if toOwnerId === current user (self-transfer).** |
| GET | /:id/transfer-history | protect | Transfer history for a cattle record. |

### Identification Sub-routes (mounted on /api/v1/cattle)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /identify | userOnly | Submit identification request. Multipart: front, back, right, left images. Creates IdentificationRequest → triggers ML (async). |
| GET | /identify/my-requests | userOnly | Current user's identification requests. Supports status filter, pagination. |
| GET | /identify/statistics | adminOnly | Identification request statistics (counts by status, priority, etc.). |
| GET | /identify/:id | userOnly | Single identification request detail (must be owner). |
| PUT | /identify/:id/cancel | userOnly | Cancel pending identification request (owner only, only if status='pending'). **Also decrements identificationRequestsPending counter on all M-Admins in the user's jurisdiction to prevent stat drift.** |

---

## Admin Routes — /api/v1/admin
File: `src/routes/adminRoutes.js`
Controller: `src/controllers/adminController.js`

All routes require `protect` + `adminOnly` minimum.

### Super Admin Sub-routes

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /super-admin/regional-admins | superAdminOnly | Create regional admin account. Body: admin fields + role + jurisdictionLevel + assignedRegion. |
| GET | /super-admin/regional-admins | superAdminOnly | List all admins (regional + m_admin). Supports role filter. |
| PUT | /super-admin/regional-admins/:id/approve | superAdminOnly | Approve an admin account. Sets isApproved=true, approvedBy, approvedAt. Sends notification. |
| PUT | /super-admin/regional-admins/:id/deactivate | superAdminOnly | Deactivate an admin. Sets isActive=false. |
| POST | /super-admin/m-admin | superAdminOnly | Create M-Admin account directly. |
| GET | /super-admin/farmers | superAdminOnly | List all farmer (user) accounts. |
| POST | /super-admin/farmers | superAdminOnly | Create farmer account on behalf. |
| GET | /super-admin/cattle | superAdminOnly | All cattle in system, no jurisdiction filter. |
| POST | /super-admin/cattle | superAdminOnly | Register cattle on behalf of a farmer. |

### Regional Admin Sub-routes

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /regional-admin/farmers | adminOnly | Farmers within regional admin's jurisdiction. |
| POST | /regional-admin/farmers | adminOnly | Create farmer within jurisdiction. |
| GET | /regional-admin/cattle | adminOnly | Cattle within jurisdiction. |
| POST | /regional-admin/cattle | adminOnly | Register cattle within jurisdiction. |
| DELETE | /regional-admin/farmers/:id | adminOnly | Remove farmer account (jurisdiction scoped). |
| DELETE | /regional-admin/cattle/:id | adminOnly | Remove cattle record (jurisdiction scoped). **Also cancels any pending TransferRequests for the cattle and removes it from the owner's User.cattle array.** |

### M-Admin Sub-routes

#### Cattle Verification Queue

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /m-admin/cattle/pending | mAdminOnly | Cattle with verification.status='pending_verification' in jurisdiction. Sorted by submittedAt. Includes overdue flag. |
| GET | /m-admin/cattle/:id/verify | mAdminOnly | Full cattle record for verification: all images, owner info, duplicate check info. |
| PUT | /m-admin/cattle/:id/approve | mAdminOnly | Approve cattle. Calls cattle.approve(adminId). Updates admin statistics. Sends notification to farmer. |
| PUT | /m-admin/cattle/:id/reject | mAdminOnly | Reject cattle. Body: rejectionReason (required). Calls cattle.reject(adminId, reason). Sends notification to farmer. |

#### ML Registration Failures

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /m-admin/ml-failed-cattle | mAdminOnly | Cattle with mlRegistration.status='manual_pending' in jurisdiction. |
| POST | /m-admin/cattle/:id/register-ml | mAdminOnly | Manually trigger ML gallery registration for a cattle. Calls addUnknownCattle(muzzle[0], cattleId). On success: status='registered'. On fail: keeps manual_pending. Sends notification to owner. |

#### Identification Requests

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /m-admin/identification/pending | mAdminOnly | Pending/escalated identification requests in jurisdiction. |
| GET | /m-admin/identification/:id | mAdminOnly | Full identification request: images, user info, mlRetry state. |
| GET | /m-admin/identification/:id/farmer-cattle | mAdminOnly | All cattle belonging to the requesting farmer (for manual matching). |
| PUT | /m-admin/identification/:id/start | mAdminOnly | Start manual processing. Calls request.startProcessing(adminId). |
| PUT | /m-admin/identification/:id/complete | mAdminOnly | Complete with result. Body: found (bool), cattleId (if found, required when found=true), confidence, message. Calls request.completeWithResult(data). Sends notification to farmer. **Returns 400 if found=true but cattleId is missing or invalid.** |
| PUT | /m-admin/identification/:id/fail | mAdminOnly | Mark as failed. Body: message. Calls request.markAsFailed(msg). Sends notification to farmer. |

#### Verification History

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /m-admin/verification-history | mAdminOnly | Cattle with verification.status='approved' or 'rejected'. Supports date range, status filters, pagination. |
| PUT | /m-admin/verification-history/:id | mAdminOnly | Update a previous verification decision (corrective action). |

#### Identification History

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /m-admin/identification-history | mAdminOnly | Identification requests with status='completed' or 'failed'. Supports filters and pagination. |
| PUT | /m-admin/identification-history/:id | mAdminOnly | Update a previous identification decision. |

### Common Admin Routes

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /dashboard | adminOnly | Dashboard statistics. Super admin: global counts. M-Admin: jurisdiction stats + pending verification count + ML-failed cattle count + pending identification count. Regional admin: jurisdiction counts. |
| GET | /notifications | adminOnly | Paginated list of admin's notifications. Query: page, limit, isRead filter. |
| PUT | /notifications/:id/read | adminOnly | Mark single notification as read. |
| PUT | /notifications/read-all | adminOnly | Mark all admin's notifications as read. |

---

## User Routes — /api/v1/users
File: `src/routes/userRoutes.js`
Controller: `src/controllers/userController.js`

All routes require `protect` + `userOnly`.

### Profile Management

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /profile | userOnly | Current user's full profile. |
| PUT | /profile | userOnly | Update profile fields (firstName, lastName, dateOfBirth, occupation, address). |
| PUT | /profile-picture | userOnly | Upload profile picture. Multipart: profilePicture field. |
| PUT | /change-password | userOnly | Body: currentPassword, newPassword. Validates current, hashes new. |
| PUT | /email | userOnly | Update email. Sends OTP to new email for verification. |
| PUT | /mobile | userOnly | Update mobile number. |

### User's Cattle

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /cattle | userOnly | All cattle owned by current user. |
| GET | /cattle/:id | userOnly | Single cattle detail (must be owner). |

### Transfer Requests

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /transfer-requests | userOnly | All transfer requests (sent or received) for current user. |
| GET | /transfer-requests/:id | userOnly | Single transfer request detail. |
| PUT | /transfer-requests/:id/accept | userOnly | Accept a received transfer. Calls transfer.accept(). Updates cattle owner. **Sends `transfer_request_accepted` notification to the original sender (fromOwner).** |
| PUT | /transfer-requests/:id/reject | userOnly | Reject a received transfer. Body: message (optional). **Sends `transfer_request_rejected` notification to the original sender (fromOwner).** |
| PUT | /transfer-requests/:id/cancel | userOnly | Cancel a sent transfer (initiator only, pending only). **Sends `transfer_request_cancelled` notification to the recipient (toOwner).** |

### Account Management

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /statistics | userOnly | User's personal stats: cattle counts by status/verification, transfer counts, ID request counts. |
| PUT | /deactivate | userOnly | Self-deactivate account. Sets isActive=false. |
| DELETE | /account | userOnly | Permanently delete account and associated data. **Also: (1) cancels all pending TransferRequests (both as sender and receiver) and notifies the other party, (2) cancels all pending/processing IdentificationRequests.** |

### Notifications

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /notifications | userOnly | Paginated notifications for current user. Query: page, limit, isRead, type. |
| PUT | /notifications/read-all | userOnly | Mark all user's notifications as read. |
| PUT | /notifications/:id/read | userOnly | Mark single notification as read. |

---

## Location Routes — /api/v1/locations
File: `src/routes/locationRoutes.js`
Controller: `src/controllers/locationController.js`

**All routes are PUBLIC — no authentication required.**
Used by mobile signup form for state/district dropdowns.

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /states | PUBLIC | Returns list of all Indian states. |
| GET | /states/:state/districts | PUBLIC | Returns list of districts for a given state name. |

---

## Request / Response Patterns

### Success Response Shape
```json
{
  "success": true,
  "message": "Human readable message",
  "data": { ... }
}
```

### Error Response Shape
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

### Pagination Query Params (where supported)
- `page` (default: 1)
- `limit` (default: 10)
- `sort` (field name, prefix `-` for descending)

### Authentication Headers
```
Authorization: Bearer <accessToken>
```

### Multipart Requests
Use `Content-Type: multipart/form-data`.
Image fields must be actual file uploads, not base64.

---

## Status Code Usage

| Code | When |
|------|------|
| 200 | Successful GET, PUT, DELETE |
| 201 | Successful POST (resource created) |
| 400 | Validation error, bad request body |
| 401 | Missing or invalid JWT |
| 403 | Valid JWT but insufficient role/access |
| 404 | Resource not found |
| 409 | Conflict (duplicate cattle detected) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
