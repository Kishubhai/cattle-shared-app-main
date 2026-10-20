# MongoDB Models Documentation

All models live in:
`/media/runtime/DATA/fromD/Projects/working_final_cattel/cattle-identification-backend/src/models/`

---

## 1. User.js
**Collection:** users
**Purpose:** Farmer / cattle owner accounts

### Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| firstName | String | Yes | trimmed |
| lastName | String | Yes | trimmed |
| email | String | Yes | unique, lowercase |
| mobileNumber | String | No | |
| password | String | Yes | bcrypt hashed (pre-save hook) |
| profilePicture | String | No | file path / URL |
| dateOfBirth | Date | No | |
| occupation | String | No | |

### Nested: address
| Field | Type |
|-------|------|
| houseAndStreet | String |
| district | String |
| state | String |
| country | String |
| pinCode | String |

### Nested: location (GeoJSON)
| Field | Type | Notes |
|-------|------|-------|
| type | String | Always 'Point' |
| coordinates | [Number] | [longitude, latitude] |

### Nested: verification
| Field | Type | Default |
|-------|------|---------|
| emailVerified | Boolean | false |
| mobileVerified | Boolean | false |

### Nested: otp
| Field | Type |
|-------|------|
| code | String |
| expiresAt | Date |
| attempts | Number |

### Nested: otpRateLimit
Tracks SMS OTP send frequency (does NOT apply to email-based OTP flows).

| Field | Type | Description |
|-------|------|-------------|
| count | Number | OTP sends in current 24h window |
| windowStart | Date | Start of the current 24h window |
| lastSentAt | Date | Timestamp of last OTP send |

### Associations
| Field | Type | Notes |
|-------|------|-------|
| cattle | [ObjectId] | refs Cattle |

### Timestamps
createdAt, updatedAt (Mongoose timestamps: true)

### Instance Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| comparePassword | (candidatePassword) | bcrypt.compare against stored hash |
| generateOTP | (skipRateLimit = false) | Creates 6-digit OTP, sets otp.code/expiresAt/attempts. Tracks otpRateLimit unless skipRateLimit=true. Pass true for email-OTP flows to avoid consuming SMS quota. |
| verifyOTP | (code) | Validates code against stored OTP, checks expiry and attempt count |
| canRequestOTP | () | Returns rate-limit decision before sending SMS OTP. Three possible outcomes: `{ allowed: true }` / `{ allowed: false, reason: 'too_soon', remainingSeconds, expiresAt }` / `{ allowed: false, reason: 'rate_limit', resetAt, message }`. Frontend uses `remainingSeconds` to navigate directly to OTP input screen. |

---

## 2. Admin.js
**Collection:** admins
**Purpose:** Regional admins, M-Admins, and Super Admins

### Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| firstName | String | Yes | |
| lastName | String | Yes | |
| email | String | Yes | unique |
| mobileNumber | String | No | |
| password | String | Yes | bcrypt hashed |
| role | String (enum) | Yes | see Role enum |
| jurisdictionLevel | String (enum) | Yes | see JurisdictionLevel enum |
| isActive | Boolean | true | account enabled flag |
| isApproved | Boolean | false | requires super_admin approval |
| approvedBy | ObjectId | No | ref Admin (super_admin) |
| approvedAt | Date | No | |

### Role Enum
```
'regional_admin' | 'm_admin' | 'super_admin'
```

### JurisdictionLevel Enum
```
'national' | 'state' | 'district' | 'pincode'
```

### Nested: assignedRegion
| Field | Type |
|-------|------|
| state | String |
| district | String |
| pincode | String |

### Nested: statistics
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| pendingVerifications | Number | 0 | Cattle awaiting verification |
| approvedCattle | Number | 0 | Total cattle approved |
| rejectedCattle | Number | 0 | Total cattle rejected |
| totalVerifications | Number | 0 | All verification actions |
| identificationRequestsPending | Number | 0 | Pending ID requests |
| identificationRequestsCompleted | Number | 0 | Completed ID requests |

### Nested: otp
Same structure as User.otp (code, expiresAt, attempts)

### Timestamps
createdAt, updatedAt

### Instance Methods
| Method | Description |
|--------|-------------|
| comparePassword(candidatePassword) | bcrypt.compare |
| generateOTP() | 6-digit OTP with expiry |
| verifyOTP(code) | Validates OTP |
| canManageRegion(state, district, pincode) | Returns bool: checks if request falls within assignedRegion |

---

## 3. Cattle.js
**Collection:** cattle
**Purpose:** Livestock records with ML registration state and verification lifecycle

### Core Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| cattleId | String | Yes | auto: C{timestamp}{random}, unique |
| temporaryId | String | No | TEMP-{cattleId}, cleared after registration |
| owner | ObjectId | Yes | ref User |
| breed | String | Yes | |
| tagNo | String | No | physical ear tag |
| medicalHistory | String | No | |
| age | Number | Yes | in months or years |
| color | String | No | |
| type | String | No | dairy, beef, etc. |

### Nested: images
Each image sub-field: `{ filename, path, uploadedAt, size, mimetype }`

| Field | Count | Description |
|-------|-------|-------------|
| images.muzzle | Array (5) | Primary ML input |
| images.face | Array (5) | Face views |
| images.fullBodyLeft | Array (1) | Full body left |
| images.fullBodyRight | Array (1) | Full body right |
| images.left | Array (empty) | Legacy; new regs store `[]` |
| images.right | Array (empty) | Legacy; new regs store `[]` |

### status Enum
```
'active' | 'archive' | 'transit'
```
Default: 'transit' (set active after verification approval)

### Nested: verification
| Field | Type | Notes |
|-------|------|-------|
| status | String (enum) | pending_verification, approved, rejected |
| verifiedBy | ObjectId | ref Admin (m_admin) |
| verifiedAt | Date | |
| rejectionReason | String | required if rejected |
| submittedAt | Date | set on creation |
| turnaroundDeadline | Date | submittedAt + VERIFICATION_TURNAROUND_HOURS (48h) |

### Nested: mlRegistration
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| status | String (enum) | 'not_started' | see MLStatus enum |
| retryCount | Number | 0 | attempts made |
| lastRetryAt | Date | | |
| nextRetryAt | Date | | when to next attempt |
| registeredAt | Date | | set on success |

### MLRegistration Status Enum
```
'not_started' | 'in_progress' | 'registered' | 'failed' | 'manual_pending'
```
- not_started: initial state
- in_progress: gallery add attempted, will retry
- registered: successfully added to ML gallery
- failed: all retries exhausted (legacy)
- manual_pending: 4+ retries failed, M-Admin must manually trigger

### Location Fields
| Field | Type | Required |
|-------|------|----------|
| location.state | String | Yes |
| location.district | String | Yes |
| location.pinCode | String | No |

### Duplicate Detection
| Field | Type |
|-------|------|
| isDuplicate | Boolean (default false) |
| duplicateOf | ObjectId ref Cattle |

### Transfer / Identification History
| Field | Type |
|-------|------|
| transferHistory | [ObjectId] refs TransferRequest |
| identificationHistory | [{ identifiedAt, identifiedBy: ObjectId, method: 'image_scan'|'manual_search' }] |

### Timestamps
createdAt, updatedAt

### Instance Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| approve | (mAdminId) | Sets verification.status='approved', status='active', verifiedBy, verifiedAt |
| reject | (mAdminId, reason) | Sets verification.status='rejected', rejectionReason |
| archive | (userId) | Sets status='archive' (owner only) |
| restore | () | Sets status='active' (or back to transit) |
| isVerificationOverdue | () | Returns true if now > turnaroundDeadline |

### Virtuals
| Virtual | Description |
|---------|-------------|
| totalImages | Sum of all image arrays lengths |

---

## 4. IdentificationRequest.js
**Collection:** identificationrequests
**Purpose:** Cattle identification requests from farmers with ML retry state

### Core Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| requestId | String | Yes | auto: IDR-{timestamp}{random}, unique |
| user | ObjectId | Yes | ref User |
| status | String (enum) | Yes | see Status enum |
| priority | String (enum) | No | 'low'|'normal'|'high' (default: 'normal') |
| adminNotes | String | No | internal notes |
| expiresAt | Date | Yes | now + 7 days (TTL index) |
| cancelledBy | ObjectId | No | ref User |
| cancelledAt | Date | No | |
| cancellationReason | String | No | |

### Status Enum
```
'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
```

### Nested: images
Each: `{ filename, path, size, mimetype }`
| Field | Description |
|-------|-------------|
| images.front | Front/muzzle (ML primary input) |
| images.back | Back view |
| images.right | Right side |
| images.left | Left side |

### Nested: processing
| Field | Type | Description |
|-------|------|-------------|
| startedAt | Date | |
| completedAt | Date | |
| processedBy | ObjectId | ref Admin |
| timeTaken | Number | seconds (completedAt - startedAt) |

### Nested: result
| Field | Type | Description |
|-------|------|-------------|
| found | Boolean | true if cattle identified |
| cattle | ObjectId | ref Cattle (if found) |
| cattleId | String | the Cattle.cattleId string (if found) |
| confidence | Number | ML similarity score |
| message | String | human-readable result |
| identifiedAt | Date | |

### Nested: location
| Field | Type |
|-------|------|
| latitude | Number |
| longitude | Number |
| address | String |

### Nested: mlRetry
| Field | Type | Description |
|-------|------|-------------|
| count | Number | Retry attempts (0 = first try) |
| nextRetryAt | Date | When to next attempt ML |
| lastRetryAt | Date | Last attempt timestamp |
| escalatedAt | Date | Set when escalated to M-Admin; prevents further retries |

### Indexes
- expiresAt: TTL index (7 days → auto-delete)
- user, status: compound for efficient queries

### Instance Methods
| Method | Description |
|--------|-------------|
| startProcessing(adminId) | Sets status='processing', processing.startedAt, processing.processedBy |
| completeWithResult(data) | Sets status='completed', result.*, processing.completedAt, timeTaken |
| markAsFailed(message) | Sets status='failed', result.message |
| cancel(userId, reason) | Sets status='cancelled', cancelledBy, cancelledAt, cancellationReason |
| isExpired() | Returns true if now > expiresAt |

### Static Methods
| Method | Description |
|--------|-------------|
| cleanupExpired() | Deletes all documents past expiresAt |
| getPendingCount(region) | Count of pending requests optionally filtered by region |

---

## 5. Notification.js
**Collection:** notifications
**Purpose:** In-app notifications for users and admins. Auto-deleted after 90 days.

### Core Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| recipient | ObjectId | Yes | User or Admin _id |
| recipientModel | String (enum) | Yes | 'User' or 'Admin' |
| type | String (enum) | Yes | see Type enum (19 values) |
| title | String | Yes | notification heading |
| message | String | Yes | notification body |
| isRead | Boolean | false | |
| readAt | Date | No | set on read |
| priority | String (enum) | No | 'low'|'medium'|'high'|'urgent' (default: 'medium') |
| actionUrl | String | No | deep link or route |
| actionText | String | No | CTA label |
| metadata | Mixed | No | arbitrary key-value pairs |
| expiresAt | Date | Yes | now + 90 days (TTL index) |

### Related Entity References (all optional ObjectIds)
| Field | Points to |
|-------|-----------|
| relatedCattle | Cattle |
| relatedUser | User |
| relatedAdmin | Admin |
| relatedTransfer | TransferRequest |

### Notification Type Enum (19 types)

#### Cattle Lifecycle
- `cattle_registered` - farmer notified when cattle record created
- `cattle_forwarded_to_m_admin` - cattle sent for verification
- `cattle_denied_by_regional` - regional admin denied (if applicable)
- `cattle_approved` - M-Admin approved
- `cattle_rejected` - M-Admin rejected with reason

#### Verification SLA
- `verification_reminder` - upcoming deadline
- `verification_overdue` - past turnaroundDeadline

#### Transfer
- `transfer_request_received` - new transfer from another user
- `transfer_request_accepted` - recipient accepted
- `transfer_request_rejected` - recipient rejected
- `transfer_request_cancelled` - initiator cancelled

#### Admin Account
- `admin_approved` - super_admin approved new admin
- `admin_rejected` - super_admin rejected new admin
- `account_created` - welcome notification
- `account_activated` - account re-enabled
- `account_deactivated` - account disabled

#### Identification
- `identification_request_created` - new ID request submitted
- `identification_processing_started` - M-Admin began processing
- `identification_found` - cattle successfully identified
- `identification_not_found` - no match found
- `identification_failed` - processing failed

#### ML Specific
- `ml_identification_failed` - ML unable to identify (urgent, sent to M-Admins)
- `ml_registration_failed` - ML gallery registration failed (sent to M-Admin)

### Indexes
- expiresAt: TTL index (90-day auto-delete)
- recipient, isRead: compound

### Static Methods
| Method | Description |
|--------|-------------|
| createNotification(data) | Creates and saves notification; data matches schema fields |
| getUnreadCount(id, model) | Returns count of unread for given recipient |
| markAllAsRead(id, model) | Sets isRead=true, readAt=now for all recipient's notifications |
| cleanupOldNotifications(days) | Manually deletes notifications older than N days |

---

## 6. TransferRequest.js
**Collection:** transferrequests
**Purpose:** Cattle ownership transfer and sale records between farmers

### Core Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| cattle | ObjectId | Yes | ref Cattle |
| fromOwner | ObjectId | Yes | ref User (initiator) |
| toOwner | ObjectId | Yes | ref User (recipient) |
| transferType | String (enum) | Yes | see TransferType enum |
| status | String (enum) | Yes | see Status enum |
| expiresAt | Date | Yes | now + 30 days |

### TransferType Enum
```
'sell' | 'gift' | 'inheritance' | 'other'
```

### Status Enum
```
'pending' | 'accepted' | 'rejected' | 'cancelled'
```

### Nested: transferDetails
| Field | Type | Description |
|-------|------|-------------|
| price | Number | sale price (if type='sell') |
| notes | String | additional notes |
| transferDate | Date | requested transfer date |

### Nested: buyerResponse
| Field | Type |
|-------|------|
| respondedAt | Date |
| message | String |

### Timestamps
createdAt, updatedAt

### Instance Methods
| Method | Description |
|--------|-------------|
| accept() | Sets status='accepted', buyerResponse.respondedAt=now; updates Cattle.owner to toOwner |
| reject(message) | Sets status='rejected', buyerResponse.message, respondedAt=now |
| cancel(userId, reason) | Sets status='cancelled' (only fromOwner can cancel) |
| isExpired() | Returns true if now > expiresAt |

### Static Methods
| Method | Description |
|--------|-------------|
| cleanupExpired() | Marks or deletes past-expiry pending transfers |

---

## Model Relationships Summary

```
User ─────────────── owns ──────────────── Cattle (cattle[] array)
User ─────────────── submits ───────────── IdentificationRequest
User ─────────────── initiates/receives ── TransferRequest
User/Admin ─────── receives ────────────── Notification

Cattle ─────────── verified by ─────────── Admin (m_admin)
Cattle ─────────── appears in ──────────── IdentificationRequest.result.cattle
Cattle ─────────── history ─────────────── TransferRequest[]

Admin ──────────── approved by ──────────── Admin (super_admin)
Admin ──────────── processes ───────────── IdentificationRequest
Admin ──────────── receives ────────────── Notification (ml_*_failed)
```

---

## Auto-generated ID Patterns

| Model | Field | Pattern | Example |
|-------|-------|---------|---------|
| Cattle | cattleId | C{Date.now()}{Math.random().toString(36).substr(2,6).toUpperCase()} | C17234567893ABC1D |
| Cattle | temporaryId | TEMP-{cattleId} | TEMP-C17234567893ABC1D |
| IdentificationRequest | requestId | IDR-{Date.now()}{random} | IDR-17234567896XY9Z |

These are generated in a pre-save hook or in the controller before creation.
