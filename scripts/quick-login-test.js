const axios = require('axios');

async function quickLoginTest() {
  console.log('🔐 QUICK LOGIN TEST\n');
  
  const API_BASE = 'http://localhost:5000/api';
  const testUsers = [
    { username: 'admin', password: 'admin123' },
    { username: 'chris.paul', password: 'chris.paul123' },
    { username: 'samuel.kirogo', password: 'samuel.kirogo123' }
  ];
  
  for (const user of testUsers) {
    console.log(`\nTesting: ${user.username} / ${user.password}`);
    
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: user.username,
        password: user.password
      });
      
      if (response.data.success) {
        console.log(`   ✅ LOGIN SUCCESSFUL!`);
        console.log(`   Token: ${response.data.data.token.substring(0, 30)}...`);
        console.log(`   Role: ${response.data.data.user.role}`);
        
        // Test a protected endpoint
        const token = response.data.data.token;
        const customersRes = await axios.get(`${API_BASE}/customers?limit=1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`   ✅ Can access customers: ${customersRes.data.data.customers?.length || 0} found`);
        
      } else {
        console.log(`   ❌ Login failed: ${response.data.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
    }
  }
  
  console.log('\n💡 Use these credentials in your frontend:');
  console.log('   samuel.kirogo / samuel.kirogo123');
}

quickLoginTest();