const axios = require('axios');

async function testCustomerFlow() {
  console.log('🧪 Testing Customer Flow with MongoDB\n');
  
  const API_BASE = 'http://localhost:5000/api';
  
  try {
    // 1. Login with default credentials
    console.log('1. Logging in with default admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginRes.data.data.token;
    console.log('   ✅ Login successful');
    console.log('   🔐 Token received');
    
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    
    // 2. Get current user info
    console.log('\n2. Getting current user info...');
    const userRes = await axios.get(`${API_BASE}/auth/me`, authHeader);
    console.log(`   ✅ User: ${userRes.data.data.username} (${userRes.data.data.role})`);
    
    // 3. Get customers
    console.log('\n3. Getting customers...');
    const customersRes = await axios.get(`${API_BASE}/customers?limit=5`, authHeader);
    const customers = customersRes.data.data.customers || [];
    console.log(`   ✅ Found ${customers.length} customers`);
    
    if (customers.length > 0) {
      const customer = customers[0];
      
      // 4. Get customer details
      console.log(`\n4. Getting customer details (${customer._id})...`);
      const detailsRes = await axios.get(`${API_BASE}/customers/${customer._id}`, authHeader);
      console.log(`   ✅ Customer: ${detailsRes.data.data.customer.name}`);
      console.log(`   ✅ Phone: ${detailsRes.data.data.customer.phoneNumber}`);
      console.log(`   ✅ Loan Balance: ${detailsRes.data.data.customer.loanBalance}`);
      
      // 5. Get transactions
      console.log(`\n5. Getting transactions...`);
      const transRes = await axios.get(`${API_BASE}/transactions?customerId=${customer._id}`, authHeader);
      console.log(`   ✅ Found ${transRes.data.data.length} transactions`);
      
      // 6. Test comments
      console.log(`\n6. Testing comments...`);
      const commentsRes = await axios.get(`${API_BASE}/customers/${customer._id}/comments`, authHeader);
      const comments = commentsRes.data.data.comments || [];
      console.log(`   ✅ Comments: ${comments.length} found`);
      
      // 7. Test adding a comment
      console.log(`\n7. Testing comment creation...`);
      const commentData = {
        comment: 'Test comment from API',
        author: 'Admin',
        type: 'follow_up'
      };
      const createCommentRes = await axios.post(
        `${API_BASE}/customers/${customer._id}/comments`,
        commentData,
        authHeader
      );
      console.log(`   ✅ Comment created: ${createCommentRes.data.message}`);
      
      // 8. Test dashboard stats
      console.log(`\n8. Testing dashboard stats...`);
      const statsRes = await axios.get(`${API_BASE}/customers/dashboard/stats`, authHeader);
      console.log(`   ✅ Total Portfolio: ${statsRes.data.data.stats.totalLoanPortfolio}`);
      console.log(`   ✅ Total Customers: ${statsRes.data.data.stats.totalCustomers}`);
      
    } else {
      console.log('\n⚠️  No customers found. Creating a sample customer...');
      
      // Create a sample customer
      const customerData = {
        name: 'Test Customer',
        phoneNumber: '254712345678',
        email: 'test@example.com',
        nationalId: '12345678',
        accountNumber: 'TEST001',
        loanBalance: 50000,
        arrears: 10000
      };
      
      const createRes = await axios.post(`${API_BASE}/customers`, customerData, authHeader);
      console.log(`   ✅ Sample customer created: ${createRes.data.data.customer.name}`);
      console.log(`   ✅ Customer ID: ${createRes.data.data.customer._id}`);
    }
    
    // 9. Test export (requires proper CSV headers)
    console.log(`\n9. Testing export...`);
    try {
      const exportRes = await axios.get(`${API_BASE}/customers/export`, {
        ...authHeader,
        responseType: 'arraybuffer' // Changed from 'stream' to 'arraybuffer'
      });
      console.log('   ✅ Export endpoint working');
      console.log(`   📁 File size: ${exportRes.data.length} bytes`);
    } catch (exportErr) {
      console.log('   ⚠️  Export error:', exportErr.message);
      console.log('   💡 Make sure CSV headers are set correctly in backend');
    }
    
    console.log('\n🎉 CUSTOMER FLOW TESTS PASSED!');
    console.log('\n💡 Frontend should now work with MongoDB backend.');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Agent: agent / agent123');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message);
      
      if (error.response.status === 401) {
        console.log('\n💡 Solution: Run the admin creation script:');
        console.log('   node scripts/createAdmin.js');
      }
    }
  }
}

testCustomerFlow();