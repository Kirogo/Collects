// Quick test to check if navigation works
console.log('=== TESTING CUSTOMER TABLE NAVIGATION ===');

// Simulate a customer object from MongoDB
const mockCustomer = {
  _id: '694956695c314fbc61ee18b4',      // MongoDB ObjectId
  customerId: 'CUST003',                 // Business ID
  id: undefined,                         // Legacy JSON field
  name: 'Peter Ochieng Ombogo',
  phoneNumber: '254734567890'
};

console.log('Mock Customer:', mockCustomer);
console.log('customer._id:', mockCustomer._id);        // ✅ This exists
console.log('customer.id:', mockCustomer.id);          // ❌ This is undefined
console.log('customer.customerId:', mockCustomer.customerId); // ✅ This exists

// The fix in CustomerTable.jsx:
const customerId = mockCustomer._id || mockCustomer.customerId || mockCustomer.id;
console.log('Navigating with ID:', customerId); // Should be: 694956695c314fbc61ee18b4

console.log('=== TEST COMPLETE ===');