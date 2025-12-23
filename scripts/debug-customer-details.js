require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

async function debugCustomerDetails() {
  console.log('🔍 DEBUGGING CUSTOMER DETAILS ISSUE\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    // Get the problematic customer ID from your error
    const customerId = '694956695c314fbc61ee18b4';
    console.log(`\nLooking for customer with ID: ${customerId}`);
    console.log(`ID Type: ${typeof customerId}`);
    console.log(`Is valid ObjectId: ${mongoose.Types.ObjectId.isValid(customerId)}`);
    
    // Try different ways to find the customer
    console.log('\n🔍 SEARCHING WITH DIFFERENT METHODS:');
    
    // 1. Try by _id (ObjectId)
    console.log('\n1. Searching by _id (ObjectId)...');
    try {
      const byObjectId = await Customer.findById(customerId);
      console.log(`   Result: ${byObjectId ? '✅ Found' : '❌ Not found'}`);
      if (byObjectId) {
        console.log(`   Customer: ${byObjectId.name} (${byObjectId.customerId})`);
        console.log(`   Phone: ${byObjectId.phoneNumber}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // 2. Try by customerId (string ID)
    console.log('\n2. Searching by customerId...');
    try {
      const byCustomerId = await Customer.findOne({ customerId: customerId });
      console.log(`   Result: ${byCustomerId ? '✅ Found' : '❌ Not found'}`);
      if (byCustomerId) {
        console.log(`   Customer: ${byCustomerId.name} (${byCustomerId._id})`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // 3. Try by customerInternalId
    console.log('\n3. Searching by customerInternalId...');
    try {
      const byInternalId = await Customer.findOne({ customerInternalId: customerId });
      console.log(`   Result: ${byInternalId ? '✅ Found' : '❌ Not found'}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // 4. List all customers to see their IDs
    console.log('\n📋 LISTING ALL CUSTOMERS:');
    const allCustomers = await Customer.find({}).limit(5).select('name customerId _id phoneNumber');
    allCustomers.forEach((cust, index) => {
      console.log(`\n   Customer ${index + 1}:`);
      console.log(`   Name: ${cust.name}`);
      console.log(`   _id (ObjectId): ${cust._id}`);
      console.log(`   customerId (string): ${cust.customerId}`);
      console.log(`   Phone: ${cust.phoneNumber}`);
    });
    
    // 5. Check if there's a mismatch in IDs
    console.log('\n🔧 CHECKING FOR ID MISMATCH:');
    const problemCustomer = allCustomers.find(c => c.name.includes('Peter Ochieng Ombogo'));
    if (problemCustomer) {
      console.log(`   Found Peter: ${problemCustomer._id}`);
      console.log(`   Expected: ${customerId}`);
      console.log(`   Match: ${problemCustomer._id.toString() === customerId}`);
    }
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugCustomerDetails();