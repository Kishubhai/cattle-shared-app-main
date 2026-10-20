require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');

/**
 * Script to create M_Admin account
 * Run: node createMAdmin.js
 */

const createMAdmin = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if M_Admin already exists
    const existingMAdmin = await Admin.findOne({ role: 'm_admin' });

    if (existingMAdmin) {
      console.log('\n⚠️  M_Admin account already exists:');
      console.log(`   Email: ${existingMAdmin.email}`);
      console.log(`   Name: ${existingMAdmin.firstName} ${existingMAdmin.lastName}`);
      console.log(`   Status: ${existingMAdmin.isActive ? 'Active' : 'Inactive'}`);

      // Ask if want to reset password
      console.log('\n💡 To reset password, delete the existing M_Admin and run this script again');
      process.exit(0);
    }

    // Create M_Admin
    console.log('\n📝 Creating M_Admin account...');

    const mAdminData = {
      firstName: 'M',
      lastName: 'Admin',
      mobileNumber: '8888888888',
      email: 'madmin@cattle.com',
      password: 'Admin@123',
      role: 'm_admin',
      assignedRegion: {
        state: 'All States',
        district: 'All Districts'
      },
      isActive: true,
      isApproved: true,
    };

    const mAdmin = await Admin.create(mAdminData);

    console.log('\n✅ M_Admin account created successfully!');
    console.log('='.repeat(50));
    console.log('📧 Email:', mAdmin.email);
    console.log('🔑 Password: Admin@123');
    console.log('👤 Name:', `${mAdmin.firstName} ${mAdmin.lastName}`);
    console.log('🎭 Role:', mAdmin.role);
    console.log('='.repeat(50));
    console.log('\n💡 Use these credentials to login to M_Admin Portal');
    console.log('🌐 M_Admin Portal: http://localhost:5173\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating M_Admin:', error.message);
    process.exit(1);
  }
};

// Run the script
createMAdmin();
