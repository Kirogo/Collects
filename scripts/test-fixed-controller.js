require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// Simulate the getCustomer logic
async function testGetCustomerLogic() {
  console.log('🧪 TESTING FIXED getCustomer LOGIC\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    const testId = '694956695c314fbc61ee18b4'; // Peter's _id
    
    console.log(`Testing with ID: ${testId}`);
    console.log(`Is valid ObjectId: ${mongoose.Types.ObjectId.isValid(testId)}`);
    
    // Test the exact logic from the controller
    let customer = null;
    
    // Method 1: Try by MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(testId)) {
      console.log('\n1. Trying findById...');
      customer = await Customer.findById(testId).select('-__v');
      console.log(`   Result: ${customer ? `✅ FOUND: ${customer.name}` : '❌ NOT FOUND'}`);
    }
    
    // Method 2: Try by customerId
    if (!customer) {
      console.log('\n2. Trying findOne with customerId...');
      customer = await Customer.findOne({ customerId: testId }).select('-__v');
      console.log(`   Result: ${customer ? `✅ FOUND: ${customer.name}` : '❌ NOT FOUND'}`);
    }
    
    // Method 3: Try by customerInternalId
    if (!customer) {
      console.log('\n3. Trying findOne with customerInternalId...');
      customer = await Customer.findOne({ customerInternalId: testId }).select('-__v');
      console.log(`   Result: ${customer ? `✅ FOUND: ${customer.name}` : '❌ NOT FOUND'}`);
    }
    
    // Method 4: Try by phone
    if (!customer) {
      console.log('\n4. Trying findOne with phoneNumber...');
      // Simple phone formatting
      const formatPhone = (phone) => {
        if (!phone) return '';
        let cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.startsWith('0') && cleaned.length === 10) {
          return '254' + cleaned.substring(1);
        }
        return phone;
      };
      
      const formattedPhone = formatPhone(testId);
      customer = await Customer.findOne({ phoneNumber: formattedPhone }).select('-__v');
      console.log(`   Result: ${customer ? `✅ FOUND: ${customer.name}` : '❌ NOT FOUND'}`);
    }
    
    if (customer) {
      console.log(`\n🎉 SUCCESS: Customer found!`);
      console.log(`   Name: ${customer.name}`);
      console.log(`   _id: ${customer._id}`);
      console.log(`   customerId: ${customer.customerId}`);
      console.log(`   Phone: ${customer.phoneNumber}`);
    } else {
      console.log('\n❌ FAILURE: Customer not found with any method');
    }
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGetCustomerLogic();