const fs = require('fs');
const path = require('path');

console.log('🔧 Verifying backend setup...\n');

const filesToCheck = [
  { path: './controllers/authController.js', required: true },
  { path: './routes/authRoutes.js', required: true },
  { path: './middleware/auth.js', required: true },
  { path: './db.json', required: true },
  { path: './server.js', required: true },
  { path: './package.json', required: true }
];

let allGood = true;

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, file.path);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`✅ ${file.path} - Found`);
    
    // Check if authController exports properly
    if (file.path.includes('authController.js')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('module.exports') || content.includes('export default')) {
          console.log(`   ✓ Properly exported`);
        } else {
          console.log(`   ⚠️  Missing module.exports`);
          allGood = false;
        }
      } catch (e) {
        console.log(`   ❌ Error reading: ${e.message}`);
        allGood = false;
      }
    }
  } else {
    if (file.required) {
      console.log(`❌ ${file.path} - MISSING (REQUIRED)`);
      allGood = false;
    } else {
      console.log(`⚠️  ${file.path} - Missing (optional)`);
    }
  }
});

// Check package.json for dependencies
const packagePath = path.join(__dirname, './package.json');
if (fs.existsSync(packagePath)) {
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const requiredDeps = ['express', 'jsonwebtoken', 'cors'];
    const missingDeps = requiredDeps.filter(dep => !packageData.dependencies?.[dep]);
    
    if (missingDeps.length > 0) {
      console.log(`\n⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
      console.log('   Run: npm install ' + missingDeps.join(' '));
    } else {
      console.log(`\n✅ All required dependencies installed`);
    }
  } catch (e) {
    console.log(`\n❌ Error reading package.json: ${e.message}`);
  }
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ Setup looks good! Try starting the server:');
  console.log('   npm run dev');
} else {
  console.log('❌ There are issues with your setup.');
  console.log('   Please fix the issues above and try again.');
}

// Also check if we can read db.json
const dbPath = path.join(__dirname, './db.json');
if (fs.existsSync(dbPath)) {
  try {
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const userCount = dbData.users?.length || 0;
    console.log(`\n📊 Database has ${userCount} users`);
    
    if (userCount > 0) {
      console.log('Sample users:');
      dbData.users.slice(0, 2).forEach(user => {
        console.log(`   - ${user.email} (${user.username})`);
      });
    }
  } catch (e) {
    console.log(`\n❌ Error reading db.json: ${e.message}`);
  }
}