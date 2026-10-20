# ML Integration Flows

## ML Service Location
`/media/runtime/DATA/fromD/Projects/working_final_cattel/cattle-identification-backend/src/utils/mlService.js`

## Retry Job Location
`/media/runtime/DATA/fromD/Projects/working_final_cattel/cattle-identification-backend/src/jobs/mlRetryJob.js`

---

## HuggingFace ML API

**Base URL:** `https://pundareekaksh-cattle-id.hf.space`
**Auth:** None (public Gradio space)
**Request format:** `multipart/form-data` with actual image file binary
**Timeout:** `ML_TIMEOUT_MS` env var (default 30,000 ms)

### ML Service Functions

#### predictCattle(imagePath)
```
POST https://pundareekaksh-cattle-id.hf.space/predict
Body: form-data { image: <file binary> }

Response:
{
  decision: 'KNOWN' | 'UNKNOWN',
  is_known: boolean,
  max_similarity: float,       // 0.0 – 1.0
  best_match: string | null    // cattleId if KNOWN, null if UNKNOWN
}
```
- Used as the **duplicate check** during cattle registration
- Used as the **identification engine** during ID requests

#### addUnknownCattle(imagePath, cattleId)
```
POST https://pundareekaksh-cattle-id.hf.space/add_unknown
Body: form-data { image: <file binary>, cattle_id: <string> }

Response:
{
  status: 'added',
  cattle_id: string,
  gallery_size: number,
  message: string
}
```
- Called after cattle registration to enroll cattle into ML gallery
- Uses `images.muzzle[0]` as the representative image

#### addKnownCattle(imagePath, cattleId)
```
POST https://pundareekaksh-cattle-id.hf.space/add_known
Body: form-data { image: <file binary>, cattle_id: <string> }

Response:
{
  status: 'updated',
  cattle_id: string,
  num_images: number,
  message: string
}
```
- Used when adding additional images to an already-registered cattle in the ML gallery

#### callMLModel(identificationRequest)
Internal wrapper used by identification flow:
1. Reads `identificationRequest.images.front.path`
2. Calls `predictCattle(frontImagePath)`
3. Translates response to:
```
{
  success: boolean,
  found: boolean,
  confidence: float,
  cattleId: string | null,
  message: string
}
```
- `found: true` when ML returns `decision: 'KNOWN'`
- `found: false` when ML returns `decision: 'UNKNOWN'`
- `success: false` when ML call itself fails (network error, timeout)

---

## Flow 1: Cattle Registration Duplicate Check + Gallery Enrollment

**Trigger:** `POST /api/v1/cattle/register` (userOnly)
**Controller:** `src/controllers/cattleController.js` → `registerCattle()`

### Steps

```
1. User submits multipart form:
   - 14 image files (muzzle[3], face[3], left[3], right[3], fullBodyLeft[1], fullBodyRight[1]) — required
   - Metadata: breed, age, color, type, tagNo, medicalHistory, location.state, location.district

2. Multer saves files to disk → file paths available in req.files

3. ML Duplicate Check (synchronous — blocks response):
   mlService.predictCattle(req.files.muzzle[0].path)

   IF response.decision === 'KNOWN':
     → Return HTTP 409: "Cattle already registered in the system. Duplicate not allowed."
     → Stop processing (no record created)

   IF response.decision === 'UNKNOWN':
     → Proceed to step 4

   IF ML call fails (network error, timeout):
     → Log warning, proceed to step 4 anyway
     → Cattle creation is not blocked by ML unavailability

4. Create Cattle document:
   {
     cattleId: "C{timestamp}{random}",
     temporaryId: "TEMP-{cattleId}",
     owner: req.user._id,
     breed, age, color, type, tagNo, medicalHistory,
     images: { muzzle, face, left, right, fullBodyLeft, fullBodyRight },
     status: 'transit',
     verification: {
       status: 'pending_verification',
       submittedAt: now,
       turnaroundDeadline: now + VERIFICATION_TURNAROUND_HOURS (48h)
     },
     mlRegistration: {
       status: 'not_started',
       retryCount: 0
     },
     location: { state, district, pinCode }
   }

5. Respond HTTP 201 to user immediately (with cattle._id and cattleId)

6. setImmediate (non-blocking, after response):
   mlService.addUnknownCattle(muzzle[0].path, cattle.cattleId)

   SUCCESS:
     cattle.mlRegistration.status = 'registered'
     cattle.mlRegistration.registeredAt = now
     save()

   FAILURE:
     cattle.mlRegistration.status = 'in_progress'
     cattle.mlRegistration.retryCount = 1
     cattle.mlRegistration.lastRetryAt = now
     cattle.mlRegistration.nextRetryAt = now + 30 minutes
     save()
     → Retry job picks it up in next cycle
```

### State Transitions (Cattle.mlRegistration.status)
```
not_started
    └──► (setImmediate) ──────────────────────────────────────────────────►  registered
                         └──► in_progress ──► (retry job, <4 tries) ──────►  registered
                                          └──► (retry job, >=4 tries) ──────►  manual_pending
```

---

## Flow 2: ML Cattle Gallery Registration Retry Job

**Trigger:** node-cron schedule, every 30 minutes
**Function:** `mlRetryJob.runMLCattleRetryJob()`
**File:** `src/jobs/mlRetryJob.js`

### Steps

```
1. Query Cattle:
   {
     'mlRegistration.status': 'in_progress',
     'mlRegistration.nextRetryAt': { $lte: now }
   }

2. For each Cattle document:

   a. Attempt: mlService.addUnknownCattle(muzzle[0].path, cattle.cattleId)

   b. SUCCESS:
      cattle.mlRegistration.status = 'registered'
      cattle.mlRegistration.registeredAt = now
      save()
      → (Optional) Notify owner that cattle is fully registered

   c. FAILURE AND retryCount < 4:
      cattle.mlRegistration.retryCount += 1
      cattle.mlRegistration.lastRetryAt = now
      cattle.mlRegistration.nextRetryAt = now + 30 minutes
      save()
      → Continue; will retry next cycle

   d. FAILURE AND retryCount >= 4:
      cattle.mlRegistration.status = 'manual_pending'
      save()

      Notify M-Admins in jurisdiction (type: 'ml_registration_failed', priority: 'urgent'):
        "Cattle {cattleId} could not be registered in AI gallery after 4 attempts.
         Manual intervention required."

      Notify owner (type: 'ml_registration_failed'):
        "Your cattle registration is still in progress. Our team is reviewing."

3. Log summary: total processed, succeeded, failed, escalated
```

### M-Admin Manual Recovery (after escalation)

**Endpoint:** `POST /api/v1/admin/m-admin/cattle/:id/register-ml`
**Controller:** `adminController.js` → `manualMLRegistration()`

```
1. M-Admin views "AI Registration Failed" section on Dashboard
2. M-Admin clicks "Register in AI" for a cattle

3. Controller:
   a. Fetch Cattle (must be mlRegistration.status='manual_pending')
   b. Call mlService.addUnknownCattle(muzzle[0].path, cattle.cattleId)

   SUCCESS:
     cattle.mlRegistration.status = 'registered'
     cattle.mlRegistration.registeredAt = now
     save()
     Notify owner: "Cattle successfully registered in AI system"
     Return 200

   FAILURE:
     Keep status = 'manual_pending'
     Log error
     Return 500 with error message
```

---

## Flow 3: Cattle Identification Request + Initial ML Processing

**Trigger:** `POST /api/v1/cattle/identify` (userOnly)
**Controller:** `src/controllers/identificationController.js`

### Steps

```
1. User submits multipart form:
   - 4 image files: front, back, right, left
   - Optional: location (latitude, longitude, address)

2. Multer saves files to disk

3. Create IdentificationRequest document:
   {
     requestId: "IDR-{timestamp}{random}",
     user: req.user._id,
     images: { front, back, right, left },
     status: 'pending',
     priority: 'normal',
     expiresAt: now + 7 days,
     mlRetry: {
       count: 0,
       nextRetryAt: now          // immediately eligible
     },
     location: { latitude, longitude, address }
   }

4. Respond HTTP 201 to user:
   { requestId, status: 'pending', message: "Request created, AI processing started" }

5. Send notification to user (type: 'identification_request_created'):
   "Your identification request has been submitted and is being processed."

6. setImmediate (non-blocking): processWithMLModel(request)
```

### processWithMLModel(request) — Internal Function

```
a. Call mlService.callMLModel(request)
   → Reads request.images.front.path
   → Calls predictCattle(frontImagePath)

b. If ML call SUCCEEDS:

   Case: found=true (KNOWN cattle)
     - Search Cattle collection by cattleId string from ML response
     - If Cattle found in DB:
         request.completeWithResult({
           found: true,
           cattle: cattle._id,
           cattleId: cattle.cattleId,
           confidence: mlResult.confidence,
           message: "Cattle identified successfully",
           identifiedAt: now
         })
         Notify user (type: 'identification_found'):
           "We identified your cattle: {breed}, ID: {cattleId}"
     - If Cattle NOT found in DB (ML knows it, DB doesn't):
         request.completeWithResult({
           found: false,
           message: "Match found in AI but cattle record not in database",
           identifiedAt: now
         })
         Notify user (type: 'identification_not_found')

   Case: found=false (UNKNOWN cattle)
     - request.completeWithResult({
         found: false,
         message: "No matching cattle found",
         identifiedAt: now
       })
       Notify user (type: 'identification_not_found'):
         "No matching cattle found in our database."

c. If ML call FAILS (network/timeout):

   request.mlRetry.count += 1           // now = 1
   request.mlRetry.lastRetryAt = now
   request.mlRetry.nextRetryAt = now + 30 minutes
   save()

   If count was 0 (first failure), notify user (type: 'identification_processing_started'):
     "Your request is being processed. You'll be notified when complete."
   (Do NOT spam user on every retry failure)
```

### State Transitions (IdentificationRequest.status)
```
pending ──► (ML success) ──────────────────────────────────────────── completed
        └──► (ML fail, count<4) ──► pending (retry scheduled)
                                 └──► (count>=4) ──► pending + escalatedAt set
                                                     (M-Admin takes over)
cancelled ──► (user cancels while pending)
```

---

## Flow 4: ML Identification Retry Job + M-Admin Escalation

**Trigger:** node-cron schedule, every 30 minutes
**Function:** `mlRetryJob.runMLIdentificationRetryJob()`
**File:** `src/jobs/mlRetryJob.js`

### Steps

```
1. Query IdentificationRequest:
   {
     status: 'pending',
     'mlRetry.nextRetryAt': { $lte: now },
     'mlRetry.escalatedAt': { $exists: false }   // not yet escalated
   }

2. For each IdentificationRequest:

   a. Check mlRetry.count:

      IF count < 4:
        → Call processWithMLModel(request) again (same logic as Flow 3, step 6)
        → Success: request becomes 'completed', user notified
        → Failure: count incremented, nextRetryAt += 30 min

      IF count >= 4:
        → escalateIdentificationToMAdmin(request)

3. escalateIdentificationToMAdmin(request):

   a. Set mlRetry.escalatedAt = now on the request (prevents further retry job processing)
   b. Save request

   c. Find M-Admins whose jurisdiction covers request's user location

   d. For each M-Admin, create notification (type: 'ml_identification_failed', priority: 'urgent'):
      "Identification request {requestId} from farmer {name} could not be processed by AI.
       Manual review required."
      actionUrl: /m-admin/identification/{requestId}

   e. Notify requesting user (type: 'identification_processing_started' or custom message):
      "Your identification request is being reviewed by our expert team.
       You'll be notified with results soon."

4. Log summary
```

### M-Admin Manual Identification Processing

**Endpoint sequence:**
1. `GET /api/v1/admin/m-admin/identification/pending`
2. `GET /api/v1/admin/m-admin/identification/:id` (view request images)
3. `GET /api/v1/admin/m-admin/identification/:id/farmer-cattle` (see farmer's registered cattle)
4. `PUT /api/v1/admin/m-admin/identification/:id/start` (begin processing)
5. `PUT /api/v1/admin/m-admin/identification/:id/complete` (submit decision) OR `PUT .../fail`

```
Complete Body:
{
  found: true,
  cattleId: "C17234...",   // if found
  confidence: 0.92,        // optional
  message: "Matched based on muzzle print and breed characteristics"
}

OR

Fail Body:
{
  message: "Unable to determine cattle identity from provided images"
}
```

```
On Complete:
  request.completeWithResult(data)
  request.processing.processedBy = adminId
  Notify user (type: 'identification_found' or 'identification_not_found')

On Fail:
  request.markAsFailed(message)
  Notify user (type: 'identification_failed')
```

---

## Retry Schedule Summary

| Flow | Frequency | Max retries | Escalation |
|------|-----------|-------------|------------|
| Cattle ML registration | 30 min | 4 | M-Admin manual trigger |
| Cattle ID ML processing | 30 min | 4 | M-Admin manual review |

---

## ML Error Handling Principles

1. **Non-blocking registration:** Cattle record creation is never blocked by ML failure. Users always get a 201 response even if ML is down.
2. **Non-blocking identification:** IdentificationRequest is created immediately. ML runs asynchronously.
3. **Retry before escalation:** 4 attempts (1 initial + 3 retries over ~90 minutes) before human escalation.
4. **No duplicate user spam:** Users are only notified once during retry phase, then again at escalation/completion.
5. **M-Admin notification on escalation:** Urgent priority notifications with direct action URLs sent to all M-Admins in the relevant jurisdiction.
6. **Manual recovery preserved:** M-Admin can always manually trigger ML registration for stuck cattle via the dashboard.
7. **Stat consistency on cancellation:** When a user cancels an identification request, the `identificationRequestsPending` counter on all relevant M-Admins is decremented (floor 0) to prevent dashboard counts from drifting.
8. **Null-safe completion:** M-Admin completing an identification with `found: true` but missing `cattleId` returns 400 before any DB writes (prevents null-pointer TypeError).

---

## ML Status Reference (Quick Lookup)

### Cattle.mlRegistration.status

| Status | Meaning | Next action |
|--------|---------|-------------|
| not_started | Initial DB state | setImmediate will attempt gallery add |
| in_progress | Gallery add attempted, retrying | Retry job will pick up at nextRetryAt |
| registered | Successfully in ML gallery | No action needed |
| failed | (Legacy state) | N/A |
| manual_pending | 4+ retries failed | M-Admin must manually trigger register-ml |

### IdentificationRequest flow states

| mlRetry.count | escalatedAt | status | Meaning |
|---------------|-------------|--------|---------|
| 0 | absent | pending | First attempt running/scheduled |
| 1-3 | absent | pending | Retrying automatically |
| 4+ | absent | pending | About to escalate |
| any | present | pending | Escalated to M-Admin, no more auto-retries |
| any | any | completed | ML or M-Admin resolved |
| any | any | failed | M-Admin marked as unresolvable |
| any | any | cancelled | User cancelled |
