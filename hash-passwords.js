// backend/hash-passwords.js
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

async function hashPasswords() {
  try {
    // Read the database
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    console.log('Current users:');
    db.users.forEach(user => {
      console.log(`- ${user.username}: ${user.password} (plain text)`);
    });
    
    // Hash each user's password
    for (let user of db.users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      user.password = hashedPassword;
      console.log(`Hashed password for ${user.username}`);
    }
    
    // Save back to file
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    console.log('\n✅ All passwords have been hashed!');
    console.log('\n🔑 Try logging in with:');
    console.log('1. Username: samuel.kirogo, Password: pass1234');
    console.log('2. Username: admin, Password: admin@1');
    console.log('3. Username: chris.paul, Password: cpaul@2025');
    
  } catch (error) {
    console.error('Error hashing passwords:', error);
  }
}

hashPasswords();