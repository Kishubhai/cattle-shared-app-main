const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('./src/models/Admin');
const User = require('./src/models/User');
const Cattle = require('./src/models/Cattle');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check M-Admin accounts
    const mAdmins = await Admin.find({ role: 'm_admin' });
    console.log(`📋 M-Admin Accounts Found: ${mAdmins.length}`);
    mAdmins.forEach((admin, index) => {
      console.log(`\n${index + 1}. ${admin.firstName} ${admin.lastName}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Approved: ${admin.isApproved}`);
      console.log(`   Assigned Region: ${admin.assignedRegion?.state || 'Global'}`);
    });

    // Check pending cattle
    console.log('\n\n📊 Pending Cattle Status:');
    const pendingCattle = await Cattle.find({
      status: 'transit',
      'verification.status': 'pending_verification'
    }).populate('owner', 'firstName lastName');

    console.log(`Total Pending: ${pendingCattle.length}`);

    if (pendingCattle.length > 0) {
      console.log('\nPending Cattle List:');
      pendingCattle.forEach((cattle, index) => {
        console.log(`\n${index + 1}. ${cattle.cattleId || cattle.temporaryId}`);
        console.log(`   Breed: ${cattle.breed}`);
        console.log(`   Owner: ${cattle.owner?.firstName} ${cattle.owner?.lastName}`);
        console.log(`   Location: ${cattle.location?.district}, ${cattle.location?.state}`);
        console.log(`   Submitted: ${cattle.verification?.submittedAt}`);
      });
    }

    // Check all transit cattle
    console.log('\n\n📋 All Transit Cattle:');
    const allTransitCattle = await Cattle.find({ status: 'transit' }).populate('owner', 'firstName lastName');
    console.log(`Total Transit: ${allTransitCattle.length}`);
    allTransitCattle.forEach((cattle, index) => {
      console.log(`\n${index + 1}. ${cattle.cattleId || cattle.temporaryId}`);
      console.log(`   Verification Status: ${cattle.verification?.status || 'N/A'}`);
      console.log(`   Breed: ${cattle.breed}`);
      console.log(`   Owner: ${cattle.owner?.firstName} ${cattle.owner?.lastName}`);
    });

    // Check all cattle counts
    console.log('\n\n📈 Summary:');
    const transitCount = await Cattle.countDocuments({ status: 'transit' });
    const activeCount = await Cattle.countDocuments({ status: 'active' });
    const totalCount = await Cattle.countDocuments({});
    console.log(`Transit: ${transitCount}`);
    console.log(`Active: ${activeCount}`);
    console.log(`Total: ${totalCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

checkData();
