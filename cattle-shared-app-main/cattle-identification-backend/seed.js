/**
 * seed.js  —  Drop entire DB then seed one account per role
 *
 * Usage:  node seed.js
 *
 * Credentials seeded:
 * ─────────────────────────────────────────────────────────────
 *  Role             Login                    Password
 * ─────────────────────────────────────────────────────────────
 *  Farmer (user)    mobile: 9519440810       Farmer123
 *  Super Admin      super@cattle.com         Admin123
 *  Regional Admin   regional@cattle.com      Admin123
 *                   → Gorakhpur, Uttar Pradesh (district-level)
 *  M Admin          madmin@cattle.com        Admin123
 * ─────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─── DB Connection ────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI   ||
  process.env.DATABASE_URL||
  process.env.DB_URI;

if (!MONGO_URI) {
  console.error('ERROR: No MongoDB URI in .env (MONGODB_URI / MONGO_URI / DATABASE_URL / DB_URI)');
  process.exit(1);
}

// ─── Inline schemas ───────────────────────────────────────────────────────────
const { Schema } = mongoose;

const userSchema = new Schema({
  firstName:        { type: String, required: true },
  lastName:         { type: String, required: true },
  email:            { type: String, required: true },
  mobileNumber:     { type: String, required: true },
  password:         { type: String, required: true, select: false },
  dateOfBirth:      { type: Date },
  occupation:       { type: String, default: 'Farmer' },
  address: {
    houseAndStreet: { type: String },
    village:        { type: String },
    district:       { type: String, required: true },
    state:          { type: String, required: true },
    country:        { type: String, default: 'India' },
    pinCode:        { type: String, required: true },
  },
  isEmailVerified:  { type: Boolean, default: false },
  isMobileVerified: { type: Boolean, default: false },
  isActive:         { type: Boolean, default: true },
  role:             { type: String, default: 'user' },
}, { timestamps: true });

const adminSchema = new Schema({
  firstName:         { type: String, required: true },
  lastName:          { type: String, required: true },
  email:             { type: String, required: true, unique: true },
  mobileNumber:      { type: String, required: true, unique: true },
  password:          { type: String, required: true, select: false },
  role:              { type: String, enum: ['regional_admin', 'm_admin', 'super_admin'], required: true },
  jurisdictionLevel: { type: String, enum: ['national', 'state', 'district', 'pincode'], default: 'district' },
  assignedRegion: {
    state:    { type: String },
    district: { type: String },
    pincode:  { type: String },
  },
  isEmailVerified:  { type: Boolean, default: true },
  isMobileVerified: { type: Boolean, default: true },
  isActive:         { type: Boolean, default: true },
  isApproved:       { type: Boolean, default: true },
  createdBy:        { type: String, default: 'backend_team' },
}, { timestamps: true });

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🔌  Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log(`✅  Connected: ${mongoose.connection.host}\n`);

  // Drop every collection (Atlas free-tier doesn't allow dropDatabase)
  console.log('🗑️   Clearing all collections...');
  const cols = await mongoose.connection.db.listCollections().toArray();
  for (const col of cols) {
    await mongoose.connection.db.dropCollection(col.name);
    console.log(`    dropped → ${col.name}`);
  }
  console.log(cols.length ? '✅  Database cleared.\n' : '✅  Database already empty.\n');

  const User  = mongoose.model('User',  userSchema);
  const Admin = mongoose.model('Admin', adminSchema);

  // Hash passwords
  const farmerHash = await bcrypt.hash('Farmer123', 10);
  const adminHash  = await bcrypt.hash('Admin123', 10);

  // ── 1. Farmer ──────────────────────────────────────────────────────────────
  const farmer = await User.create({
    firstName:        'Karan',
    lastName:         'Singh',
    email:            'techgeekskaran@gmail.com',
    mobileNumber:     '9519440810',
    password:         farmerHash,
    dateOfBirth:      new Date('1998-05-15'),
    occupation:       'Farmer',
    address: {
      houseAndStreet: '12 Civil Lines',
      village:        'Sahjanwa',
      district:       'Gorakhpur',
      state:          'Uttar Pradesh',
      pinCode:        '273001',
    },
    isEmailVerified:  true,
    isMobileVerified: true,
    isActive:         true,
  });

  // ── 2. Super Admin ─────────────────────────────────────────────────────────
  const superAdmin = await Admin.create({
    firstName:         'Super',
    lastName:          'Admin',
    email:             'super@cattle.com',
    mobileNumber:      '9000000001',
    password:          adminHash,
    role:              'super_admin',
    jurisdictionLevel: 'national',
    assignedRegion:    {},
  });

  // ── 3. Regional Admin (Gorakhpur, UP — district level) ────────────────────
  const regionalAdmin = await Admin.create({
    firstName:         'Regional',
    lastName:          'Admin',
    email:             'regional@cattle.com',
    mobileNumber:      '9000000002',
    password:          adminHash,
    role:              'regional_admin',
    jurisdictionLevel: 'district',
    assignedRegion:    { state: 'Uttar Pradesh', district: 'Gorakhpur' },
  });

  // ── 4. M Admin (national — verifies cattle) ────────────────────────────────
  const mAdmin = await Admin.create({
    firstName:         'M',
    lastName:          'Admin',
    email:             'madmin@cattle.com',
    mobileNumber:      '9000000003',
    password:          adminHash,
    role:              'm_admin',
    jurisdictionLevel: 'national',
    assignedRegion:    {},
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log('🌱  Seed complete!\n');
  console.log('  Role             Login                      Password');
  console.log(line);
  console.log(`  Farmer           9519440810  (mobile)       Farmer123`);
  console.log(`                   techgeekskaran@gmail.com`);
  console.log(`                   📍 Gorakhpur, Uttar Pradesh`);
  console.log('');
  console.log(`  Super Admin      super@cattle.com           Admin123`);
  console.log(`                   🌏 National — sees everything`);
  console.log('');
  console.log(`  Regional Admin   regional@cattle.com        Admin123`);
  console.log(`                   📍 Gorakhpur, Uttar Pradesh (district-level)`);
  console.log(`                   ⚠️  Only sees Gorakhpur farmers & cattle`);
  console.log('');
  console.log(`  M Admin          madmin@cattle.com          Admin123`);
  console.log(`                   🌏 National — verifies cattle (web portal only)`);
  console.log(line + '\n');

  await mongoose.disconnect();
  console.log('🔌  Disconnected. Done!\n');
}

run().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
