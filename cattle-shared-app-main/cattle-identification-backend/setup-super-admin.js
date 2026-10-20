/**
 * ============================================================
 * SUPER ADMIN SETUP SCRIPT
 * Cattle Identification System
 * ============================================================
 *
 * This script creates a Super Admin account with standard credentials
 *
 * Usage:
 *   node setup-super-admin.js
 *
 * Force recreate:
 *   node setup-super-admin.js --force
 *
 * ============================================================
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("./src/models/Admin");

// ============================================================
// SUPER ADMIN CONFIGURATION
// ============================================================

const SUPER_ADMIN = {
  firstName: "Super",
  lastName: "Admin",
  username: "superadmin",
  email: process.env.SUPER_ADMIN_EMAIL || "superadmin@cattleidentification.com",
  mobileNumber: "9999999999",
  password: process.env.SUPER_ADMIN_DEFAULT_PASSWORD || "SuperAdmin@123",
  role: "super_admin",
  isApproved: true,
  isActive: true,
  isEmailVerified: true,
  isMobileVerified: true,
  assignedRegion: {
    state: "All India",
    districts: [],
  },
  createdBy: "backend_team",
};

// ============================================================
// MAIN SETUP FUNCTION
// ============================================================

async function setupSuperAdmin() {
  let connection;

  try {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║                                                    ║");
    console.log("║      CATTLE IDENTIFICATION SYSTEM                  ║");
    console.log("║      Super Admin Setup Script                      ║");
    console.log("║                                                    ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    // ========== Step 1: Connect to MongoDB ==========
    console.log("📡 Step 1: Connecting to MongoDB...");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("❌ MONGODB_URI not found in .env file");
    }

    await mongoose.connect(mongoUri);
    connection = mongoose.connection;
    console.log("✅ Connected to MongoDB successfully");
    console.log(`   Database: ${connection.name}\n`);

    // ========== Step 2: Check existing Super Admin ==========
    console.log("🔍 Step 2: Checking for existing Super Admin...");

    const existingSuperAdmin = await Admin.findOne({
      role: "super_admin",
      isActive: true,
    });

    if (existingSuperAdmin && !process.argv.includes("--force")) {
      console.log("⚠️  Super Admin already exists!\n");
      console.log("╔════════════════════════════════════════════════════╗");
      console.log("║           EXISTING SUPER ADMIN DETAILS             ║");
      console.log("╠════════════════════════════════════════════════════╣");

      const name =
        `${existingSuperAdmin.firstName || "N/A"} ${existingSuperAdmin.lastName || ""}`.trim();
      const username = existingSuperAdmin.username || "Not set";
      const email = existingSuperAdmin.email || "Not set";
      const mobile = existingSuperAdmin.mobileNumber || "Not set";
      const status = existingSuperAdmin.isActive ? "✅ Active" : "❌ Inactive";

      console.log(`║ Name:     ${name.padEnd(40)} ║`);
      console.log(`║ Username: ${username.padEnd(40)} ║`);
      console.log(`║ Email:    ${email.padEnd(40)} ║`);
      console.log(`║ Mobile:   ${mobile.padEnd(40)} ║`);
      console.log(`║ Status:   ${status.padEnd(40)} ║`);
      console.log("╚════════════════════════════════════════════════════╝\n");

      console.log("💡 To recreate the Super Admin with new credentials, run:");
      console.log("   node setup-super-admin.js --force\n");

      await mongoose.connection.close();
      process.exit(0);
    }

    // ========== Step 3: Delete existing if force flag ==========
    if (process.argv.includes("--force")) {
      console.log(
        "⚠️  Force mode enabled - Deleting existing Super Admin(s)...",
      );
      const deleteResult = await Admin.deleteMany({ role: "super_admin" });
      console.log(
        `✅ Deleted ${deleteResult.deletedCount} existing Super Admin(s)\n`,
      );
    }

    // ========== Step 4: Create new Super Admin ==========
    console.log("👤 Step 3: Creating new Super Admin account...\n");

    const superAdmin = new Admin(SUPER_ADMIN);
    await superAdmin.save();

    console.log("✅ Super Admin created successfully!\n");

    // ========== Step 5: Display credentials ==========
    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║                                                    ║");
    console.log("║            SUPER ADMIN CREDENTIALS                 ║");
    console.log("║                                                    ║");
    console.log("╠════════════════════════════════════════════════════╣");
    console.log(`║ Username:  ${SUPER_ADMIN.username.padEnd(39)} ║`);
    console.log(`║ Password:  ${SUPER_ADMIN.password.padEnd(39)} ║`);
    console.log(`║ Email:     ${SUPER_ADMIN.email.padEnd(39)} ║`);
    console.log(`║ Mobile:    ${SUPER_ADMIN.mobileNumber.padEnd(39)} ║`);
    console.log(`║ Role:      ${SUPER_ADMIN.role.padEnd(39)} ║`);
    console.log("║                                                    ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    // ========== Step 6: Verify password ==========
    console.log("🧪 Step 4: Verifying credentials...");

    const testAdmin = await Admin.findOne({
      email: SUPER_ADMIN.email,
    }).select("+password");

    const isPasswordValid = await testAdmin.comparePassword(
      SUPER_ADMIN.password,
    );

    if (isPasswordValid) {
      console.log("✅ Password verification: PASSED\n");
    } else {
      console.log("❌ Password verification: FAILED\n");
      throw new Error("Password verification failed");
    }

    // ========== Step 7: Display next steps ==========
    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║                                                    ║");
    console.log("║                  NEXT STEPS                        ║");
    console.log("║                                                    ║");
    console.log("╠════════════════════════════════════════════════════╣");
    console.log("║                                                    ║");
    console.log("║ 1. Start your backend server:                     ║");
    console.log("║    > node server.js                                ║");
    console.log("║                                                    ║");
    console.log("║ 2. Test login endpoint:                            ║");
    console.log("║    POST /api/v1/auth/admin/login                   ║");
    console.log("║    Body: {                                         ║");
    console.log('║      "username": "superadmin",                     ║');
    console.log('║      "password": "SuperAdmin@123"                  ║');
    console.log("║    }                                               ║");
    console.log("║                                                    ║");
    console.log("║ 3. Import Postman collection and test:            ║");
    console.log("║    > Cattle_API_Complete.postman_collection.json  ║");
    console.log("║                                                    ║");
    console.log("║ 4. Login to admin panel and create:               ║");
    console.log("║    - Regional Admins                               ║");
    console.log("║    - M-Admins                                      ║");
    console.log("║    - Manage farmers and cattle                     ║");
    console.log("║                                                    ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    console.log("📍 API Endpoints:");
    console.log("   Base URL: https://788sf054-8000.inc1.devtunnels.ms/api/v1");
    console.log("   Login:    POST /auth/admin/login");
    console.log("   Dashboard: GET /admin/super-admin/statistics\n");

    console.log("📚 Documentation:");
    console.log("   API Reference: API_ENDPOINTS_DOCUMENTATION.md");
    console.log("   Backend Fix:   BACKEND_FIX_SUMMARY.md\n");

    // ========== Step 8: Close connection ==========
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    console.log("🎉 Setup completed successfully!\n");

    process.exit(0);
  } catch (error) {
    console.error("\n╔════════════════════════════════════════════════════╗");
    console.error("║                                                    ║");
    console.error("║                    ERROR                           ║");
    console.error("║                                                    ║");
    console.error("╚════════════════════════════════════════════════════╝\n");

    console.error("❌ Error occurred during setup:\n");
    console.error(`   Message: ${error.message}\n`);

    if (error.errors) {
      console.error("   Validation Errors:");
      Object.keys(error.errors).forEach((key) => {
        console.error(`   - ${key}: ${error.errors[key].message}`);
      });
      console.error("");
    }

    console.error("💡 Troubleshooting:");
    console.error("   1. Check .env file has MONGODB_URI");
    console.error("   2. Ensure MongoDB is running and accessible");
    console.error("   3. Verify network connectivity");
    console.error("   4. Check Admin model in src/models/Admin.js");
    console.error("   5. Run: npm install\n");

    if (connection && connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
}

// ============================================================
// RUN SETUP
// ============================================================

console.log("\n🚀 Starting Super Admin setup...\n");
setupSuperAdmin();
