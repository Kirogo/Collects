console.log('Testing imports...\n');

try {
  console.log('1. Testing paymentController import...');
  const pc = require('./controllers/paymentController');
  console.log('✅ Success! Exports:', Object.keys(pc));
  
  console.log('\n2. Testing authController import...');
  const ac = require('./controllers/authController');
  console.log('✅ Success! Exports:', Object.keys(ac));
  
  console.log('\n3. Testing customerController import...');
  const cc = require('./controllers/customerController');
  console.log('✅ Success! Exports:', Object.keys(cc));
  
  console.log('\n🎉 All imports working!');
} catch (error) {
  console.error('❌ Import error:', error.message);
  console.error('Stack:', error.stack);
}