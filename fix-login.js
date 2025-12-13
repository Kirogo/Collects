const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function fixDatabase() {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    
    // Read database
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    
    console.log('🔧 Fixing database login issues...');
    
    // Check if users exist
    if (db.users && db.users.length > 0) {
      console.log(`Found ${db.users.length} users`);
      
      // Re-hash all passwords
      for (let user of db.users) {
        const oldPassword = user.password;
        
        // If password is not hashed (doesn't start with $2a$)
        if (!oldPassword.startsWith('$2a$')) {
          console.log(`Re-hashing password for ${user.email}`);
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(oldPassword, salt);
        }
      }
      
      // Save database
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      console.log('✅ Database fixed successfully');
      
    } else {
      console.log('No users found in database');
      await createDefaultUsers();
    }
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
  }
}

async function createDefaultUsers() {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@2024', salt);
    const supervisorHash = await bcrypt.hash('Super@2024', salt);
    const agentHash = await bcrypt.hash('Agent@2024', salt);
    
    db.users = [
      {
        id: 'USR1001',
        username: 'admin',
        email: 'admin@ncbabank.co.ke',
        password: adminHash,
        fullName: 'System Administrator',
        employeeId: 'EMP001',
        role: 'ADMIN',
        department: 'IT',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: 'USR1002',
        username: 'supervisor',
        email: 'supervisor@ncbabank.co.ke',
        password: supervisorHash,
        fullName: 'Collections Supervisor',
        employeeId: 'EMP002',
        role: 'SUPERVISOR',
        department: 'Collections',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: 'USR1003',
        username: 'agent1',
        email: 'agent1@ncbabank.co.ke',
        password: agentHash,
        fullName: 'John Mwangi',
        employeeId: 'EMP003',
        role: 'AGENT',
        department: 'Collections',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null
      }
    ];
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('✅ Created default users');
    console.log('   Admin: admin@ncbabank.co.ke / Admin@2024');
    console.log('   Supervisor: supervisor@ncbabank.co.ke / Super@2024');
    console.log('   Agent: agent1@ncbabank.co.ke / Agent@2024');
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
  }
}

// Run the fix
fixDatabase();