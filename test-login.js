// Run with: node test-login.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const testCases = [
  // Test with email
  { identifier: 'admin@ncbabank.co.ke', password: 'Admin@2024', type: 'email' },
  // Test with username
  { identifier: 'admin', password: 'Admin@2024', type: 'username' },
  // Test with email in username field
  { identifier: 'staff@ncbabank.co.ke', password: 'Staff@2024', type: 'username-as-email' }
];

async function testLogin() {
  console.log('Testing backend login with multiple identifier types...\n');
  
  for (const test of testCases) {
    try {
      console.log(`Testing ${test.type}: ${test.identifier}`);
      
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        [test.type.includes('email') ? 'email' : 'username']: test.identifier,
        password: test.password
      });
      
      console.log(`✓ Success: ${response.data.message}`);
      console.log(`  Token: ${response.data.token.substring(0, 20)}...`);
      console.log(`  User: ${response.data.user.name} (${response.data.user.role})\n`);
      
    } catch (error) {
      console.log(`✗ Failed: ${error.response?.data?.message || error.message}\n`);
    }
  }
}

testLogin();