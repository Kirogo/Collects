const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function testPassword() {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    
    console.log('🔍 Testing password setup...');
    
    if (db.users && db.users.length > 0) {
      const user = db.users[0];
      console.log('User:', user.email);
      console.log('Stored password:', user.password);
      console.log('Is hashed?', user.password.startsWith('$2a$'));
      
      // Test password comparison
      const testPassword = 'Admin@2024';
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log('Password "Admin@2024" matches?', isMatch);
      
      // Test wrong password
      const wrongPassword = 'WrongPassword';
      const isWrongMatch = await bcrypt.compare(wrongPassword, user.password);
      console.log('Password "WrongPassword" matches?', isWrongMatch);
      
    } else {
      console.log('No users in database');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testPassword();