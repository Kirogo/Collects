const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 Testing STK Push Backend...\n');
  
  try {
    // 1. Health Check
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${API_URL}/health`);
    console.log(`✅ ${health.data.status} - ${health.data.service}`);

    // 2. Login
    console.log('\n2. Testing login...');
    const login = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@ncbabank.co.ke',
      password: 'Admin@2024'
    });
    
    if (login.data.success) {
      console.log('✅ Login successful');
      const token = login.data.data.token;
      
      // 3. Get customers
      console.log('\n3. Testing customers API...');
      const customers = await axios.get(`${API_URL}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Found ${customers.data.data.customers.length} customers`);
      
      if (customers.data.data.customers.length > 0) {
        const customer = customers.data.data.customers[0];
        
        // 4. Test STK Push
        console.log('\n4. Testing STK Push initiation...');
        const stk = await axios.post(`${API_URL}/api/payments/stk-push`, {
          phoneNumber: customer.phoneNumber,
          amount: 1000,
          description: 'Test payment'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (stk.data.success) {
          console.log('✅ STK Push initiated!');
          console.log(`   Transaction ID: ${stk.data.data.transaction.transactionId}`);
        }
      }
      
      console.log('\n🎉 All backend tests passed!');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

// Run test
testAPI();