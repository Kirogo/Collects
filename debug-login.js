const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function debugLogin() {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    
    console.log('🔍 DEBUGGING LOGIN ISSUE\n');
    
    if (db.users && db.users.length > 0) {
      const user = db.users.find(u => u.email === 'admin@ncbabank.co.ke');
      
      if (user) {
        console.log('✅ Found admin user');
        console.log('Email:', user.email);
        console.log('Full Name:', user.fullName);
        console.log('Password hash (first 30 chars):', user.password.substring(0, 30) + '...');
        console.log('Password length:', user.password.length);
        console.log('Is hashed?', user.password.startsWith('$2a$'));
        
        // Test with correct password
        console.log('\n🧪 Testing password comparison:');
        console.log('Testing password: "Admin@2024"');
        
        try {
          const isMatch = await bcrypt.compare('Admin@2024', user.password);
          console.log('Result:', isMatch ? '✅ MATCHES' : '❌ DOES NOT MATCH');
          
          if (!isMatch) {
            console.log('\n🔧 Possible issues:');
            console.log('1. Wrong password stored');
            console.log('2. Password in db.json might be different');
            console.log('3. Hash might be corrupted');
            
            // Let's check what happens if we create a new hash
            console.log('\n🔍 Creating new hash for comparison:');
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash('Admin@2024', salt);
            console.log('New hash (first 30 chars):', newHash.substring(0, 30) + '...');
            console.log('Length:', newHash.length);
            
            // Compare new hash with stored hash
            console.log('\n🔍 Comparing structures:');
            console.log('Stored hash prefix:', user.password.substring(0, 7));
            console.log('New hash prefix:', newHash.substring(0, 7));
            console.log('Are prefixes same?', user.password.substring(0, 7) === newHash.substring(0, 7));
          }
          
        } catch (bcryptError) {
          console.error('❌ bcrypt.compare error:', bcryptError.message);
        }
        
      } else {
        console.log('❌ Admin user not found in database');
        console.log('Available users:', db.users.map(u => u.email));
      }
      
    } else {
      console.log('❌ No users in database');
    }
    
    console.log('\n📊 Database summary:');
    console.log('Total users:', db.users?.length || 0);
    console.log('Total customers:', db.customers?.length || 0);
    console.log('Total transactions:', db.transactions?.length || 0);
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugLogin();