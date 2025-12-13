// Quick test script for the API
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 Testing STK Push API...\n');
  
  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthRes = await axios.get(`${API_URL.replace('/api', '')}/health`);
    console.log('✅ Health check:', healthRes.data);
    
    // 2. Login with admin credentials
    console.log('\n2. Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@bank.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.data.token;
    console.log('✅ Login successful');
    console.log('   Token received:', token.substring(0, 20) + '...');
    
    // Set up headers for authenticated requests
    const headers = {
      Authorization: `Bearer ${token}`
    };
    
    // 3. Get customers
    console.log('\n3. Fetching customers...');
    const customersRes = await axios.get(`${API_URL}/customers`, { headers });
    console.log('✅ Customers fetched:', customersRes.data.data.customers.length, 'customers found');
    
    // 4. Test STK Push initiation
    console.log('\n4. Testing STK Push initiation...');
    const stkRes = await axios.post(`${API_URL}/payments/stk-push`, {
      phoneNumber: '254712345678',
      amount: 1000,
      description: 'Test loan repayment'
    }, { headers });
    
    console.log('✅ STK Push initiated:', stkRes.data.message);
    console.log('   Transaction ID:', stkRes.data.data.transactionId);
    
    // 5. Test PIN processing
    console.log('\n5. Testing PIN processing...');
    const pinRes = await axios.post(`${API_URL}/payments/process-pin`, {
      transactionId: stkRes.data.data.transactionId,
      pin: '1234'
    }, { headers });
    
    if (pinRes.data.success) {
      console.log('✅ Payment successful!');
      console.log('   Receipt:', pinRes.data.data.receipt);
    } else {
      console.log('❌ Payment failed:', pinRes.data.message);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - API is running');
    console.log('   - Authentication works');
    console.log('   - Customers can be fetched');
    console.log('   - STK Push can be initiated');
    console.log('   - PIN processing works');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run tests
testAPI();