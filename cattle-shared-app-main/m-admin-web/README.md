# M_Admin Web Portal

Secret verification portal for M_Admin to verify cattle registrations.

## Features

- **Secure Login**: M_Admin only access with authentication
- **Dashboard**: View pending cattle verifications with statistics
- **Split-Screen Comparison**:
  - LEFT: Submitted cattle with all details and images
  - RIGHT: ALL other cattle in database for comparison
- **Image Categories**: View by Muzzle, Face, Left Side, Right Side, Full Body views
- **Approve/Reject**: Final authority to approve or reject cattle registrations

## Tech Stack

- React 18+ with Vite
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env and set VITE_API_URL to your backend URL
```

3. Run development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Usage

1. Login with M_Admin credentials
2. View pending cattle on dashboard
3. Click "Verify" on any cattle
4. Compare submitted cattle (left) with all existing cattle (right)
5. Switch between image categories (Muzzle, Face, etc.)
6. Approve or Reject based on comparison

## Important Notes

- This portal is SECRET - users don't know about M_Admin verification
- Only M_Admins can access this portal
- All cattle must go through M_Admin verification before approval
- Users only see "pending verification" status, not M_Admin involvement

## API Endpoints Used

- POST /api/v1/auth/admin/login - Login
- GET /api/v1/admin/m-admin/cattle/pending - Get pending cattle
- GET /api/v1/admin/m-admin/cattle/:id/verify - Get cattle for verification
- PUT /api/v1/admin/m-admin/cattle/:id/approve - Approve cattle
- PUT /api/v1/admin/m-admin/cattle/:id/reject - Reject cattle
- GET /api/v1/admin/dashboard - Get statistics

## Environment Variables

- VITE_API_URL: Backend API base URL (default: https://788sf054-8000.inc1.devtunnels.ms/api/v1)
