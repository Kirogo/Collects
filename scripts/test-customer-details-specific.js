const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

async function testSpecificCustomer() {
  console.log('🎯 TESTING SPECIFIC CUSTOMER DETAILS\n');
  
  const API_BASE = 'http://localhost:5000/api';
  
  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'samuel.kirogo',
      password: 'samuel.kirogo123'
    });
    
    const token = loginRes.data.data.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    
    console.log('✅ Login successful');
    
    // 2. Get all customers to find Peter
    console.log('\n2. Getting all customers...');
    const customersRes = await axios.get(`${API_BASE}/customers`, authHeader);
    const customers = customersRes.data.data.customers || [];
    
    console.log(`Found ${customers.length} customers`);
    
    // Find Peter Ochieng Ombogo
    const peter = customers.find(c => c.name.includes('Peter Ochieng Ombogo'));
    
    if (!peter) {
      console.log('❌ Peter not found in customers list');
      return;
    }
    
    console.log(`\n🔍 Found Peter: ${peter.name}`);
    console.log(`   _id: ${peter._id}`);
    console.log(`   customerId: ${peter.customerId}`);
    console.log(`   customerInternalId: ${peter.customerInternalId}`);
    
    // 3. Test getting Peter's details with _id
    console.log(`\n3. Testing customer details with _id: ${peter._id}`);
    try {
      const detailsRes1 = await axios.get(`${API_BASE}/customers/${peter._id}`, authHeader);
      console.log(`   ✅ Success with _id: ${detailsRes1.status}`);
      console.log(`   Customer: ${detailsRes1.data.data.customer.name}`);
    } catch (error1) {
      console.log(`   ❌ Failed with _id: ${error1.response?.status || 'Error'}`);
      console.log(`   Message: ${error1.response?.data?.message || error1.message}`);
    }
    
    // 4. Test with customerId
    console.log(`\n4. Testing customer details with customerId: ${peter.customerId}`);
    try {
      const detailsRes2 = await axios.get(`${API_BASE}/customers/${peter.customerId}`, authHeader);
      console.log(`   ✅ Success with customerId: ${detailsRes2.status}`);
      console.log(`   Customer: ${detailsRes2.data.data.customer.name}`);
    } catch (error2) {
      console.log(`   ❌ Failed with customerId: ${error2.response?.status || 'Error'}`);
      console.log(`   Message: ${error2.response?.data?.message || error2.message}`);
    }
    
    // 5. Test with customerInternalId
    console.log(`\n5. Testing customer details with customerInternalId: ${peter.customerInternalId}`);
    try {
      const detailsRes3 = await axios.get(`${API_BASE}/customers/${peter.customerInternalId}`, authHeader);
      console.log(`   ✅ Success with customerInternalId: ${detailsRes3.status}`);
      console.log(`   Customer: ${detailsRes3.data.data.customer.name}`);
    } catch (error3) {
      console.log(`   ❌ Failed with customerInternalId: ${error3.response?.status || 'Error'}`);
      console.log(`   Message: ${error3.response?.data?.message || error3.message}`);
    }
    
    // 6. Test transactions for Peter
    console.log(`\n6. Testing transactions for Peter...`);
    try {
      const transRes = await axios.get(`${API_BASE}/transactions?customerId=${peter._id}`, authHeader);
      console.log(`   ✅ Transactions: ${transRes.data.data.length} found`);
    } catch (transError) {
      console.log(`   ❌ Transactions error: ${transError.message}`);
    }
    
  } catch (error) {
    console.error('\n❌ Overall test error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data?.message);
    }
  }
}

testSpecificCustomer();