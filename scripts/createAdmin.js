require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createAdmin() {
  try {
    console.log('👑 Creating default admin user...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log('\n💡 You can use these credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123 (or whatever you set)');
      mongoose.connection.close();
      return;
    }
    
    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@loanapp.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdBy: 'system'
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@loanapp.com');
    console.log('   Role: admin');
    console.log('\n⚠️  IMPORTANT: Change this password in production!');
    
    // Also create a sample agent user
    const agentPassword = await bcrypt.hash('agent123', salt);
    await User.create({
      username: 'agent',
      email: 'agent@loanapp.com',
      password: agentPassword,
      role: 'agent',
      isActive: true,
      createdBy: 'system'
    });
    
    console.log('\n✅ Sample agent user created:');
    console.log('   Username: agent');
    console.log('   Password: agent123');
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();