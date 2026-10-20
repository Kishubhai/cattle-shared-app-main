# 🚀 Setup Guide - Cattle Identification System

## Quick Start

### Step 1: Create Super Admin

```bash
cd cattle-identification-backend
node setup-super-admin.js
```

**Output:**

```
╔════════════════════════════════════════════════════╗
║            SUPER ADMIN CREDENTIALS                 ║
╠════════════════════════════════════════════════════╣
║ Username:  superadmin                              ║
║ Password:  SuperAdmin@123                          ║
║ Email:     superadmin@cattleidentification.com     ║
║ Mobile:    9999999999                              ║
║ Role:      super_admin                             ║
╚════════════════════════════════════════════════════╝
```

### Step 2: Start Backend Server

```bash
node server.js
```

**Expected Output:**

```
🚀 SERVER STARTED SUCCESSFULLY
🌐 Server running on port: 8000
🔗 API Base URL: http://localhost:8000/api/v1
```

### Step 3: Test Super Admin Login

**Option A: Using Postman**

1. Import: `Cattle_API_Complete.postman_collection.json`
2. Run: **Authentication → Admin Auth → Super Admin Login**
3. Token is auto-saved!

**Option B: Using cURL**

```bash
curl -X POST https://788sf054-8000.inc1.devtunnels.ms/api/v1/auth/admin/login \
-H "Content-Type: application/json" \
-d '{
  "username": "superadmin",
  "password": "SuperAdmin@123"
}'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "_id": "...",
      "firstName": "Super",
      "lastName": "Admin",
      "role": "super_admin",
      "email": "superadmin@cattleidentification.com"
    }
  }
}
```

### Step 4: Create Regional Admin

**Using Postman:**
Run: **Super Admin → Regional Admin Management → Create Regional Admin**

**Using cURL:**

```bash
curl -X POST https://788sf054-8000.inc1.devtunnels.ms/api/v1/admin/super-admin/regional-admins \
-H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "firstName": "Regional",
  "lastName": "Admin",
  "email": "regional.up@example.com",
  "mobileNumber": "9876543210",
  "password": "RegionalAdmin@123",
  "assignedRegion": {
    "state": "Uttar Pradesh",
    "districts": ["Varanasi", "Lucknow", "Kanpur"]
  }
}'
```

---

## 🔧 Advanced Options

### Force Recreate Super Admin

If super admin already exists and you want to recreate:

```bash
node setup-super-admin.js --force
```

⚠️ **Warning**: This will DELETE the existing super admin!

### Custom Credentials

Edit `.env` file:

```env
SUPER_ADMIN_EMAIL=custom@example.com
SUPER_ADMIN_DEFAULT_PASSWORD=CustomPassword@123
```

Then run:

```bash
node setup-super-admin.js --force
```

---

## 📋 Complete Workflow

### 1. Setup Backend

```bash
# Navigate to backend
cd cattle-identification-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and add your MONGODB_URI

# Create Super Admin
node setup-super-admin.js

# Start server
node server.js
```

### 2. Test with Postman

```bash
# Import collection
# File: Cattle_API_Complete.postman_collection.json

# Test sequence:
1. Super Admin Login ✅
2. Get Dashboard Statistics ✅
3. Create Regional Admin ✅
4. Get All Farmers ✅
5. Get All Cattle ✅
```

### 3. Admin Panel Operations

**As Super Admin:**

- ✅ Create Regional Admins
- ✅ Create M-Admins
- ✅ View all farmers/cattle
- ✅ Generate reports
- ✅ Search functionality

**As Regional Admin:**

- ✅ View farmers in region
- ✅ View cattle in region
- ✅ Register farmers/cattle
- ✅ Generate regional reports

**As M-Admin:**

- ✅ Verify pending cattle
- ✅ Approve/Reject cattle
- ✅ View all submissions

---

## 🔍 Troubleshooting

### Issue: "MONGODB_URI not found"

**Solution:**

```bash
# Check .env file exists
ls -la .env

# Verify MONGODB_URI is set
cat .env | grep MONGODB_URI

# If missing, add it:
echo "MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname" >> .env
```

### Issue: "Super Admin already exists"

**Solution:**

```bash
# Option 1: Use existing admin (recommended)
node setup-super-admin.js
# Will show existing credentials

# Option 2: Force recreate
node setup-super-admin.js --force
```

### Issue: "Cannot connect to MongoDB"

**Solution:**

```bash
# Check network connectivity
ping cluster.mongodb.net

# Verify MongoDB URI format
# Should be: mongodb+srv://username:password@cluster.mongodb.net/database

# Test connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected!'))"
```

### Issue: "Password verification failed"

**Solution:**

```bash
# Recreate with force
node setup-super-admin.js --force

# Check Admin model for password hashing
# File: src/models/Admin.js
```

---

## 📍 Important URLs

| Environment | Base URL                                          |
| ----------- | ------------------------------------------------- |
| Production  | `https://788sf054-8000.inc1.devtunnels.ms/api/v1` |
| Local       | `http://localhost:8000/api/v1`                    |

### Key Endpoints

| Endpoint                             | Method | Description           |
| ------------------------------------ | ------ | --------------------- |
| `/auth/admin/login`                  | POST   | Admin login           |
| `/admin/super-admin/statistics`      | GET    | Dashboard stats       |
| `/admin/super-admin/farmers`         | GET    | All farmers           |
| `/admin/super-admin/cattle`          | GET    | All cattle            |
| `/admin/super-admin/regional-admins` | POST   | Create regional admin |

---

## 🔑 Default Credentials

### Super Admin

```
Username: superadmin
Password: SuperAdmin@123
Email:    superadmin@cattleidentification.com
Mobile:   9999999999
```

### Test Farmer (Create via signup)

```
Mobile:   9876543210
Password: Password@123
```

### Regional Admin (Create via Super Admin)

```
Set custom credentials when creating
```

---

## 📚 Documentation Files

- `API_ENDPOINTS_DOCUMENTATION.md` - Complete API reference
- `BACKEND_FIX_SUMMARY.md` - What was fixed and why
- `Cattle_API_Complete.postman_collection.json` - Postman collection
- `SETUP_GUIDE.md` - This file

---

## ✅ Checklist

Before going to production:

- [ ] Super Admin created
- [ ] Backend server running
- [ ] MongoDB connected
- [ ] Super Admin login tested
- [ ] Regional Admin created
- [ ] API endpoints tested
- [ ] Frontend connected
- [ ] CORS configured
- [ ] Environment variables set

---

## 🎉 You're Ready!

1. ✅ Super Admin: Created
2. ✅ Backend: Running
3. ✅ API: Tested
4. ✅ Postman: Imported

**Next: Login to admin panel and start managing the system!**

For support, check:

- API Documentation: `API_ENDPOINTS_DOCUMENTATION.md`
- Backend Summary: `BACKEND_FIX_SUMMARY.md`

Happy coding! 🚀
