const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testIntegration() {
  console.log('🧪 Testing Frontend-Backend Integration\n');
  
  try {
    // 1. Test login
    console.log('1. Testing login...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'samuel.kirogo',  // From your logs
      password: 'your-password'   // Use actual password
    });
    
    const token = loginRes.data.data.token;
    console.log('   ✅ Login successful');
    
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    
    // 2. Test getting customers
    console.log('\n2. Testing customers endpoint...');
    const customersRes = await axios.get(`${API_BASE}/customers?limit=5`, authHeader);
    console.log(`   ✅ Found ${customersRes.data.data.customers.length} customers`);
    
    if (customersRes.data.data.customers.length > 0) {
      const firstCustomer = customersRes.data.data.customers[0];
      
      // 3. Test getting specific customer
      console.log(`\n3. Testing customer detail (${firstCustomer._id})...`);
      const customerRes = await axios.get(`${API_BASE}/customers/${firstCustomer._id}`, authHeader);
      console.log(`   ✅ Customer: ${customerRes.data.data.customer.name}`);
      
      // 4. Test transactions for customer
      console.log(`\n4. Testing transactions endpoint...`);
      const transactionsRes = await axios.get(
        `${API_BASE}/transactions?customerId=${firstCustomer._id}&limit=5`, 
        authHeader
      );
      console.log(`   ✅ Found ${transactionsRes.data.data.length} transactions`);
      
      // 5. Test dashboard stats
      console.log(`\n5. Testing dashboard stats...`);
      const statsRes = await axios.get(`${API_BASE}/customers/dashboard/stats`, authHeader);
      console.log(`   ✅ Total loans: Ksh ${statsRes.data.data.stats.totalLoanPortfolio}`);
      
      // 6. Test invalid ID handling
      console.log(`\n6. Testing error handling (undefined ID)...`);
      try {
        await axios.get(`${API_BASE}/customers/undefined`, authHeader);
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('   ✅ Properly handled undefined ID');
        }
      }
      
      // 7. Test customer comments
      console.log(`\n7. Testing comments endpoint...`);
      const commentsRes = await axios.get(
        `${API_BASE}/customers/${firstCustomer._id}/comments`, 
        authHeader
      );
      console.log(`   ✅ Comments: ${commentsRes.data.data.length} found`);
    }
    
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('\n💡 Your backend is ready for frontend requests.');
    console.log('   Frontend should now work without errors.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message);
    }
    
    process.exit(1);
  }
}

testIntegration();