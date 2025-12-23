// debug-navigation.js
console.log('=== DEBUGGING NAVIGATION FLOW ===\n');

// Simulate customer data from MongoDB
const mockCustomer = {
  _id: '694956695c314fbc61ee18b4',
  customerId: 'CUST003',
  name: 'Peter Ochieng Ombogo',
  phoneNumber: '254734567890',
  loanBalance: 50000,
  arrears: 1500
};

console.log('1. Customer data from MongoDB:');
console.log(JSON.stringify(mockCustomer, null, 2));

console.log('\n2. Available ID fields:');
console.log(`   _id: ${mockCustomer._id}`);
console.log(`   customerId: ${mockCustomer.customerId}`);
console.log(`   id: ${mockCustomer.id}`);

console.log('\n3. Navigation logic in CustomerTable:');
const customerId = mockCustomer._id || mockCustomer.customerId || mockCustomer.id;
console.log(`   customerId = _id || customerId || id`);
console.log(`   Result: ${customerId}`);

console.log('\n4. Expected URL:');
console.log(`   /customers/${customerId}`);
console.log(`   Full URL: http://localhost:3000/customers/${customerId}`);

console.log('\n5. What CustomerDetails receives:');
console.log(`   useParams().id = ${customerId}`);

console.log('\n=== DEBUG COMPLETE ===');