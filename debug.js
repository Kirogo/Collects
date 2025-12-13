// debug.js - Test each route file
const path = require('path');

console.log('🔍 Debugging route imports...\n');

try {
  console.log('1. Testing authRoutes...');
  const authRoutes = require('./routes/authRoutes');
  console.log('✅ authRoutes loaded:', typeof authRoutes);
  console.log('   Is Router?', authRoutes.name === 'router' || typeof authRoutes === 'function');
  
  console.log('\n2. Testing customerRoutes...');
  const customerRoutes = require('./routes/customerRoutes');
  console.log('✅ customerRoutes loaded:', typeof customerRoutes);
  console.log('   Is Router?', customerRoutes.name === 'router' || typeof customerRoutes === 'function');
  
  console.log('\n3. Testing paymentRoutes...');
  const paymentRoutes = require('./routes/paymentRoutes');
  console.log('✅ paymentRoutes loaded:', typeof paymentRoutes);
  console.log('   Is Router?', paymentRoutes.name === 'router' || typeof paymentRoutes === 'function');
  
  console.log('\n✅ All routes loaded successfully!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}