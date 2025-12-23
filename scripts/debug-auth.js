require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function debugAuth() {
  console.log('🔍 DEBUGGING AUTHENTICATION\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    // List all users with password info
    const users = await User.find({}).select('username email role isActive password');
    console.log('\n📋 ALL USERS IN DATABASE:');
    
    if (users.length === 0) {
      console.log('   ❌ No users found in database');
    } else {
      users.forEach((user, index) => {
        console.log(`\n   User ${index + 1}:`);
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Active: ${user.isActive ? '✅' : '❌'}`);
        console.log(`   - Has password: ${user.password ? '✅' : '❌'}`);
        if (user.password) {
          console.log(`   - Password type: ${user.password.startsWith('$2') ? 'Hashed (bcrypt)' : 'Plain text'}`);
          console.log(`   - Password length: ${user.password.length} chars`);
        }
      });
    }
    
    // Check JWT secret
    console.log('\n🔑 JWT SECRET CHECK:');
    if (process.env.JWT_SECRET) {
      console.log('   ✅ JWT_SECRET is set in .env');
      console.log('   Length:', process.env.JWT_SECRET.length, 'characters');
    } else {
      console.log('   ❌ JWT_SECRET is not set in .env');
      console.log('   💡 Add to .env: JWT_SECRET=your-secret-key-here');
    }
    
    // Test login for each user
    console.log('\n🔐 TESTING LOGIN CREDENTIALS:');
    console.log('   Try these combinations in your frontend:');
    
    users.forEach(user => {
      console.log(`\n   👤 ${user.username}:`);
      console.log(`      Username: ${user.username}`);
      console.log(`      Email: ${user.email}`);
      console.log('      Try password: (try the username or common passwords)');
    });
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugAuth();