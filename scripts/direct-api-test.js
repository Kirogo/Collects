const axios = require('axios');

async function directAPITest() {
  console.log('🎯 DIRECT API TEST FOR CUSTOMER DETAILS\n');
  
  const API_BASE = 'http://localhost:5000/api';
  const customerId = '694956695c314fbc61ee18b4'; // Peter's _id
  
  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'samuel.kirogo',
      password: 'samuel.kirogo123'
    });
    
    if (!loginRes.data.success) {
      console.log('❌ Login failed:', loginRes.data.message);
      return;
    }
    
    const token = loginRes.data.data.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    
    console.log('✅ Login successful');
    
    // 2. Direct test of customer endpoint
    console.log(`\n2. Testing GET /api/customers/${customerId}`);
    console.log(`   Using ID: ${customerId}`);
    
    try {
      const response = await axios.get(`${API_BASE}/customers/${customerId}`, authHeader);
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   ✅ Success: ${response.data.success}`);
      console.log(`   ✅ Message: ${response.data.message}`);
      
      if (response.data.success && response.data.data.customer) {
        const customer = response.data.data.customer;
        console.log(`\n🎉 CUSTOMER DATA RECEIVED:`);
        console.log(`   Name: ${customer.name}`);
        console.log(`   _id: ${customer._id}`);
        console.log(`   customerId: ${customer.customerId}`);
        console.log(`   Phone: ${customer.phoneNumber}`);
        console.log(`   Loan Balance: ${customer.loanBalance}`);
        console.log(`   Arrears: ${customer.arrears}`);
        
        console.log(`\n📊 ADDITIONAL DATA:`);
        console.log(`   Recent Transactions: ${response.data.data.recentTransactions?.length || 0}`);
        console.log(`   Total Transactions: ${response.data.data.transactionCount || 0}`);
      }
      
    } catch (apiError) {
      console.log(`   ❌ API Error: ${apiError.response?.status || 'No response'}`);
      console.log(`   Message: ${apiError.response?.data?.message || apiError.message}`);
      console.log(`   Full error response:`, JSON.stringify(apiError.response?.data, null, 2));
    }
    
    // 3. Also test with customerId (CUST003)
    console.log(`\n3. Testing GET /api/customers/CUST003`);
    try {
      const response2 = await axios.get(`${API_BASE}/customers/CUST003`, authHeader);
      console.log(`   ✅ Status: ${response2.status}`);
      console.log(`   Customer: ${response2.data.data.customer?.name || 'Not found'}`);
    } catch (error2) {
      console.log(`   ❌ Error: ${error2.response?.status || 'No response'}`);
    }
    
  } catch (error) {
    console.error('\n❌ Overall test error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data?.message);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

directAPITest();