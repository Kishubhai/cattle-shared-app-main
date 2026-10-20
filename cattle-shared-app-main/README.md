# Cattle Identification System

A multi-tier livestock management platform with AI-powered muzzle-print recognition for cattle registration, identification, and ownership management.

## System Overview

The system consists of three components that work together:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| `cattel_app/` | React Native (Expo) | Farmer & admin mobile app |
| `cattle-identification-backend/` | Node.js + Express + MongoDB | REST API server |
| `m-admin-web/` | React + Vite | M-Admin verification web portal |

### User Roles

| Role | Access | Description |
|------|--------|-------------|
| Farmer | Mobile app | Registers and manages their own cattle |
| Regional Admin | Mobile app | Oversees farmers and cattle in an assigned region |
| M-Admin | Web portal | Manually verifies cattle registrations and identification requests |
| Super Admin | Mobile app | Full system administration |

---

## Prerequisites

Ensure the following are installed before proceeding:

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **npm** v9 or later (included with Node.js)
- **MongoDB Atlas** account or a self-hosted MongoDB instance
- **Expo CLI** (for mobile app) — installed automatically with project dependencies
- A **Gmail account** with an App Password enabled (for email/OTP delivery)
- A **2Factor.in** account and API key (for SMS OTP delivery)

---

## 1. Backend — `cattle-identification-backend/`

### Setup

```bash
cd cattle-identification-backend
npm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and configure at minimum:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/CattleIdentification
JWT_SECRET=<a long random string>
JWT_REFRESH_SECRET=<another long random string>
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
TWO_FACTOR_API_KEY=your_2factor_api_key
BASE_URL=https://your-backend-domain.com
```

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App passwords. Generate a password for "Mail".

### Initialise Super Admin

Run this once to create the default Super Admin account:

```bash
node setup-super-admin.js
```

Expected output:

```
╔════════════════════════════════════════════════════╗
║            SUPER ADMIN CREDENTIALS                 ║
╠════════════════════════════════════════════════════╣
║ Username:  superadmin                              ║
║ Password:  SuperAdmin@123                          ║
║ Email:     superadmin@cattleidentification.com     ║
╚════════════════════════════════════════════════════╝
```

> **Important:** Change the Super Admin password immediately after first login.

To recreate the Super Admin (e.g. if credentials are lost):

```bash
node setup-super-admin.js --force
```

### Run

**Development (with auto-restart):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

The API server starts on port `8000` by default:

```
Server running at http://localhost:8000
API base: http://localhost:8000/api/v1
```

### API Reference

A Postman collection is included in the backend folder:

```
cattle-identification-backend/Cattle_Identification_API.postman_collection.json
```

Import this file into [Postman](https://www.postman.com) to explore and test all endpoints. Full endpoint documentation is in `docs/api-endpoints.md`.

---

## 2. Mobile App — `cattel_app/`

### Setup

```bash
cd cattel_app
npm install
```

### Configure API URL

Open `src/config/env.ts` and update the URL to point to your running backend:

```ts
const ENV = {
  API_BASE_URL: 'https://your-backend-domain.com/api/v1',
  API_TIMEOUT: 300000,
};
```

For local development, replace the URL with your machine's local IP (not `localhost`, as the device/emulator needs to reach your machine on the network):

```ts
API_BASE_URL: 'http://192.168.x.x:8000/api/v1',
```

### Run

Start the Expo development server:

```bash
npx expo start
```

Then choose your target from the terminal menu:

| Key | Action |
|-----|--------|
| `a` | Open on Android emulator or connected device |
| `i` | Open on iOS simulator (macOS only) |
| `w` | Open in web browser |
| Scan QR | Open in Expo Go app on a physical device |

### Build APK (Android)

The project is configured with EAS Build. To create a production APK:

```bash
npx eas build --platform android --profile production
```

Requires an Expo account and EAS CLI (`npm install -g eas-cli`).

---

## 3. M-Admin Web Portal — `m-admin-web/`

This is a private verification portal — it is not publicly advertised. Only M-Admin users have credentials to log in.

### Setup

```bash
cd m-admin-web
npm install
```

The `.env.example` file is already configured. Copy it:

```bash
cp .env.example .env
```

Update `VITE_API_URL` to match your backend:

```env
VITE_API_URL=https://your-backend-domain.com/api/v1
```

### Run (Development)

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Build (Production)

```bash
npm run build
```

Output is placed in the `dist/` folder. Deploy this folder to any static hosting service (Nginx, Vercel, Netlify, etc.).

---

## First-Time Setup Sequence

Follow this order when setting up the system from scratch:

1. **Start the backend** (steps above)
2. **Run `node setup-super-admin.js`** to create the Super Admin
3. **Log in as Super Admin** via the mobile app
4. **Create a Regional Admin** — Super Admin → Admin Management → Add Regional Admin
5. **Create an M-Admin** — Super Admin → Admin Management → Add M-Admin
6. **Log in to the M-Admin web portal** using the M-Admin credentials
7. **Invite farmers** to download and register on the mobile app

---

## Project Structure

```
.
├── cattel_app/                         # React Native mobile app
│   ├── app/                            # File-based screens (Expo Router)
│   │   ├── (user)/                     # Farmer screens
│   │   ├── (regional-admin)/           # Regional Admin screens
│   │   └── (super-admin)/              # Super Admin screens
│   ├── src/
│   │   ├── api/                        # Axios client & endpoint modules
│   │   ├── components/                 # Reusable UI components
│   │   ├── config/env.ts               # API base URL & timeout
│   │   ├── hooks/                      # Custom React hooks
│   │   ├── screens/                    # Screen-level components
│   │   ├── store/                      # Redux state slices
│   │   └── types/                      # TypeScript type definitions
│   └── assets/                         # Images, icons, fonts
│
├── cattle-identification-backend/       # Node.js REST API
│   ├── src/
│   │   ├── controllers/                # Request handlers (7 modules)
│   │   ├── models/                     # Mongoose schemas (6 models)
│   │   ├── routes/                     # Express route definitions
│   │   ├── middlewares/                # Auth, role, upload, error handlers
│   │   ├── utils/                      # ML service, email, SMS, tokens
│   │   └── jobs/                       # Cron jobs (ML retry)
│   ├── uploads/                        # Stored image files
│   ├── .env.example                    # Environment variable template
│   ├── server.js                       # Entry point
│   └── setup-super-admin.js            # One-time admin initialisation
│
├── m-admin-web/                         # React verification web portal
│   ├── src/
│   │   ├── pages/                      # Login, Dashboard, Verification, etc.
│   │   ├── components/                 # Shared components
│   │   ├── context/AuthContext.jsx     # M-Admin auth state
│   │   └── services/api.js             # All M-Admin API calls
│   └── .env.example                    # Environment variable template
│
└── docs/                               # Technical documentation
    ├── architecture.md                 # System architecture & auth flow
    ├── api-endpoints.md                # Complete API reference
    ├── models.md                       # MongoDB schema reference
    ├── ml-flow.md                      # ML model integration details
    └── frontend.md                     # Mobile app architecture
```

---

## Environment Variables Reference

### Backend (`cattle-identification-backend/.env`)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default: `8000`) |
| `BASE_URL` | Public URL of the backend (used in emails) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for access tokens |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens |
| `EMAIL_USER` | Gmail address for sending OTPs and notifications |
| `EMAIL_PASSWORD` | Gmail App Password |
| `TWO_FACTOR_API_KEY` | 2Factor.in API key for SMS OTP |
| `ML_SERVER_URL` | URL of the ML muzzle-print model (leave empty to disable) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |

See `.env.example` for the full list.

### M-Admin Web (`m-admin-web/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g. `https://api.example.com/api/v1`) |

---

## Documentation

Detailed technical documentation is available in the `docs/` folder:

- **`docs/architecture.md`** — System architecture, tech stack, auth flow, deployment
- **`docs/api-endpoints.md`** — Full REST API reference with request/response examples
- **`docs/models.md`** — MongoDB schema definitions
- **`docs/ml-flow.md`** — AI/ML muzzle-print recognition integration
- **`docs/frontend.md`** — Mobile app component and navigation architecture
- **`cattle-identification-backend/SETUP_GUIDE.md`** — Backend quick-start and admin setup
