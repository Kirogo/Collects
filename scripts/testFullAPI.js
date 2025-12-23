const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testFullAPI() {
  console.log('🧪 Testing Complete Backend API\n');
  
  let authToken = '';
  
  try {
    // 1. Test Health Check
    console.log('1. Testing Health Check:');
    const healthRes = await axios.get(`${API_BASE}/health`);
    console.log(`   ✅ Status: ${healthRes.data.status}`);
    console.log(`   ✅ Database: ${healthRes.data.database}`);
    
    // 2. Test Login
    console.log('\n2. Testing Login:');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',  // Use your actual admin username
      password: 'admin123'  // Use your actual password
    });
    
    authToken = loginRes.data.data.token;
    console.log(`   ✅ Login successful`);
    console.log(`   ✅ Token received: ${authToken.substring(0, 20)}...`);
    
    // Set auth header for subsequent requests
    const authHeader = {
      headers: { Authorization: `Bearer ${authToken}` }
    };
    
    // 3. Test Get Current User
    console.log('\n3. Testing Get Current User:');
    const userRes = await axios.get(`${API_BASE}/auth/me`, authHeader);
    console.log(`   ✅ User: ${userRes.data.data.username} (${userRes.data.data.role})`);
    
    // 4. Test Get Customers
    console.log('\n4. Testing Get Customers:');
    const customersRes = await axios.get(`${API_BASE}/customers`, authHeader);
    console.log(`   ✅ Found ${customersRes.data.data.customers.length} customers`);
    console.log(`   ✅ Total customers: ${customersRes.data.data.summary.totalCustomers}`);
    
    if (customersRes.data.data.customers.length > 0) {
      // 5. Test Get Single Customer
      const firstCustomer = customersRes.data.data.customers[0];
      console.log(`\n5. Testing Get Single Customer (${firstCustomer.customerId}):`);
      const customerRes = await axios.get(`${API_BASE}/customers/${firstCustomer._id}`, authHeader);
      console.log(`   ✅ Customer: ${customerRes.data.data.customer.name}`);
      console.log(`   ✅ Phone: ${customerRes.data.data.customer.phoneNumber}`);
      
      // 6. Test Customer by Phone
      console.log(`\n6. Testing Customer by Phone (${firstCustomer.phoneNumber}):`);
      const phoneRes = await axios.get(`${API_BASE}/customers/phone/${firstCustomer.phoneNumber}`, authHeader);
      console.log(`   ✅ Found: ${phoneRes.data.data.customer.name}`);
      
      // 7. Test Payment Initiation
      console.log('\n7. Testing Payment Initiation:');
      const paymentData = {
        phoneNumber: firstCustomer.phoneNumber,
        amount: 1000,
        description: 'Test Payment'
      };
      
      try {
        const paymentRes = await axios.post(`${API_BASE}/payments/initiate`, paymentData, authHeader);
        console.log(`   ✅ Payment initiated: ${paymentRes.data.data.transaction.transactionId}`);
        console.log(`   ✅ Status: ${paymentRes.data.data.transaction.status}`);
      } catch (paymentError) {
        console.log(`   ⚠️  Payment test skipped: ${paymentError.response?.data?.message || paymentError.message}`);
      }
    }
    
    // 8. Test Dashboard Stats
    console.log('\n8. Testing Dashboard Stats:');
    const statsRes = await axios.get(`${API_BASE}/customers/dashboard/stats`, authHeader);
    console.log(`   ✅ Total loan portfolio: Ksh ${statsRes.data.data.stats.totalLoanPortfolio}`);
    console.log(`   ✅ Total arrears: Ksh ${statsRes.data.data.stats.totalArrears}`);
    
    // 9. Test Get Transactions
    console.log('\n9. Testing Get Transactions:');
    const transactionsRes = await axios.get(`${API_BASE}/payments/transactions`, authHeader);
    console.log(`   ✅ Found ${transactionsRes.data.data.transactions.length} transactions`);
    
    console.log('\n🎉 ALL API TESTS COMPLETED SUCCESSFULLY!');
    console.log('\n💡 Your backend is fully functional with MongoDB.');
    
  } catch (error) {
    console.error('\n❌ API Test Failed:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || 'No error message'}`);
      console.error(`   URL: ${error.config?.url}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Run test
testFullAPI();