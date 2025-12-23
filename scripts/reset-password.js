require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  console.log('🔄 RESETTING USER PASSWORDS\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    // List users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    // Reset passwords for all users
    for (const user of users) {
      console.log(`\n👤 Resetting password for: ${user.username}`);
      
      // Create new password (username + 123)
      const newPassword = `${user.username}123`;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update user password
      user.password = hashedPassword;
      await user.save();
      
      console.log(`   ✅ Password reset to: ${newPassword}`);
      console.log(`   👉 Login with: ${user.username} / ${newPassword}`);
    }
    
    console.log('\n🎉 ALL PASSWORDS RESET SUCCESSFULLY!');
    console.log('\n📋 NEW CREDENTIALS:');
    users.forEach(user => {
      console.log(`   ${user.username} / ${user.username}123`);
    });
    
    console.log('\n⚠️  IMPORTANT: Change these passwords after login!');
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Reset error:', error.message);
    process.exit(1);
  }
}

// Ask for confirmation
console.log('⚠️  WARNING: This will reset ALL user passwords!');
console.log('   Press Ctrl+C to cancel or wait 5 seconds to continue...');

setTimeout(() => {
  resetPassword();
}, 5000);