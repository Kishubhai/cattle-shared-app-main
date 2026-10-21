# How to Set Up and Run This Project

This project has 3 parts — a backend server, a mobile app, and an admin web panel.
You need to set up the backend first, then the rest will work.

---

## Before You Start

Make sure you have these installed on your machine:

- **Node.js** (v18 or above) — https://nodejs.org
- **npm** (comes with Node.js)
- **Expo Go app** on your phone (for the mobile app) — download from Play Store or App Store

---

## 1. Backend (Server)

This is the main server. Everything connects to this.

Go into the backend folder:
```
cd cattle-identification-backend
```

**Step 1 — Create your .env file**

Copy the example file and rename it:
```
cp .env.example .env
```

Now open the `.env` file and fill in these values:

- `MONGODB_URI` — your MongoDB connection string (from MongoDB Atlas or your own MongoDB)
- `JWT_SECRET` — any random long string, like `my_super_secret_key_123`
- `JWT_REFRESH_SECRET` — another random string, different from the one above
- `EMAIL_USER` — your Gmail address
- `EMAIL_PASSWORD` — your Gmail **App Password** (not your normal Gmail password — you need to generate one from Google Account settings under 2-Step Verification → App Passwords)
- `TWO_FACTOR_API_KEY` — your 2Factor.in API key for OTP SMS

Everything else in the `.env` file you can leave as-is for now.

**Step 2 — Install packages**
```
npm install
```

**Step 3 — Create the Super Admin account** (do this only once)
```
node setup-super-admin.js
```

This will create the first admin login. You'll see the credentials printed in the terminal.

**Step 4 — Start the server**
```
npm run dev
```

The server runs on port 8000. You should see "SERVER STARTED SUCCESSFULLY" in the terminal.

> **If you see "Port 8000 is already in use" error:**
> Something else is already running on that port. Run this to fix it:
>
> Windows: `netstat -ano | findstr :8000` — note the PID number, then run `taskkill /PID <that number> /F`
>
> Mac/Linux: `kill -9 $(lsof -ti:8000)`
>
> Then try starting the server again.

---

## 2. Mobile App

The mobile app already points to the live server, so you don't need to change anything in the code.

Go into the app folder:
```
cd cattel_app
```

Install packages:
```
npm install
```

Start the app:
```
npx expo start
```

A QR code will appear in the terminal. Open the **Expo Go** app on your phone and scan it. The app will load on your phone.

> For Android you can also run `npm run android` and for iOS `npm run ios` — but you'll need Android Studio or Xcode set up for that.

---

## 3. Admin Web Panel

This is the web-based admin dashboard.

Go into the folder:
```
cd m-admin-web
```

**Step 1 — Create your .env file**
```
cp .env.example .env
```

Open the `.env` file. You'll see `VITE_API_URL` — if your backend is running locally, change it to:
```
VITE_API_URL=http://localhost:8000/api/v1
```

If your backend is deployed somewhere (like a VPS or Render), put that URL instead.

**Step 2 — Install packages**
```
npm install
```

**Step 3 — Start it**

For development (local testing):
```
npm run dev
```

For production (final build to host):
```
npm run build
```
The built files will be in the `dist` folder — upload that to your hosting.

---

## Quick Summary

| What | Command | Port |
|------|---------|------|
| Backend | `npm run dev` inside `cattle-identification-backend` | 8000 |
| Mobile App | `npx expo start` inside `cattel_app` | — |
| Admin Web | `npm run dev` inside `m-admin-web` | 5173 |

**Always start the backend first.** The mobile app and admin panel both depend on it.

---

## Common Problems

**"Port already in use"** — Kill whatever is running on that port (see the fix above in the backend section).

**"Invalid MongoDB URI"** — Double check your `MONGODB_URI` in the `.env` file. Make sure your IP is whitelisted in MongoDB Atlas (Network Access → Add IP → 0.0.0.0/0 for allow all).

**"Email not working"** — The app will still run fine without email. But if you want OTP emails to work, make sure you're using a Gmail App Password, not your regular Gmail password.

**Mobile app not loading** — Make sure your phone and computer are on the same WiFi network when using Expo Go.
