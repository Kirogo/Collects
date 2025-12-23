const axios = require('axios');

async function finalTest() {
  console.log('🎯 FINAL INTEGRATION TEST\n');
  
  const API_BASE = 'http://localhost:5000/api';
  
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
    
    console.log('   ✅ Login successful');
    console.log('   👤 User:', loginRes.data.data.user.username);
    
    // 2. Test all frontend endpoints
    console.log('\n2. Testing frontend endpoints...');
    
    const endpoints = [
      { method: 'GET', path: '/customers?limit=5', description: 'Customers list' },
      { method: 'GET', path: '/customers/dashboard/stats', description: 'Dashboard stats' },
      { method: 'GET', path: '/transactions?limit=5', description: 'Transactions' },
      { method: 'GET', path: '/payments/transactions', description: 'Payment transactions' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios({
          method: endpoint.method,
          url: API_BASE + endpoint.path,
          ...authHeader
        });
        
        console.log(`   ✅ ${endpoint.description}: ${response.status}`);
        
        // Log some data for verification
        if (endpoint.path.includes('customers') && !endpoint.path.includes('stats')) {
          const customers = response.data.data.customers || [];
          console.log(`      Found ${customers.length} customers`);
          if (customers.length > 0) {
            console.log(`      Sample: ${customers[0].name} (${customers[0].customerId})`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ ${endpoint.description}: ${error.response?.status || 'Error'} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    // 3. Test customer details flow
    console.log('\n3. Testing customer details flow...');
    
    // Get a customer first
    const customersRes = await axios.get(`${API_BASE}/customers?limit=1`, authHeader);
    if (customersRes.data.data.customers?.length > 0) {
      const customer = customersRes.data.data.customers[0];
      console.log(`   Selected customer: ${customer.name} (${customer._id})`);
      
      // Test customer details
      const detailsRes = await axios.get(`${API_BASE}/customers/${customer._id}`, authHeader);
      console.log(`   ✅ Customer details: ${detailsRes.status}`);
      
      // Test comments
      const commentsRes = await axios.get(`${API_BASE}/customers/${customer._id}/comments`, authHeader);
      console.log(`   ✅ Comments: ${commentsRes.data.data.comments?.length || 0} found`);
      
      // Test transactions for this customer
      const transRes = await axios.get(`${API_BASE}/transactions?customerId=${customer._id}`, authHeader);
      console.log(`   ✅ Customer transactions: ${transRes.data.data.length} found`);
      
    } else {
      console.log('   ⚠️  No customers to test details');
    }
    
    // 4. Test export (if customers exist)
    console.log('\n4. Testing export functionality...');
    try {
      const exportRes = await axios.get(`${API_BASE}/customers/export`, {
        ...authHeader,
        responseType: 'arraybuffer'
      });
      console.log(`   ✅ Export working: ${exportRes.headers['content-type']}`);
      console.log(`   📁 File size: ${exportRes.data.byteLength} bytes`);
    } catch (exportErr) {
      console.log(`   ⚠️  Export: ${exportErr.response?.data?.message || exportErr.message}`);
    }
    
    console.log('\n🎉 INTEGRATION TEST COMPLETE!');
    console.log('\n💡 Your frontend should now work with:');
    console.log('   Username: samuel.kirogo');
    console.log('   Password: samuel.kirogo123');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data?.message);
    }
  }
}

finalTest();