// server-fixed.js - This will work 100%
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'STK Push System is running'
  });
});

// Create SIMPLE routes directly (no imports for now)
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: 'USR1001',
        username: 'admin',
        email: 'admin@bank.com',
        role: 'ADMIN'
      },
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token'
    }
  });
});

app.get('/api/customers', (req, res) => {
  console.log('Fetching customers');
  res.json({
    success: true,
    data: {
      customers: [
        {
          id: 'CUST1001',
          phoneNumber: '254712345678',
          name: 'John Doe',
          loanBalance: 50000,
          customerId: 'CUST1001',
          accountNumber: '1001001234'
        },
        {
          id: 'CUST1002',
          phoneNumber: '254723456789',
          name: 'Jane Smith',
          loanBalance: 25000,
          customerId: 'CUST1002',
          accountNumber: '1001001235'
        }
      ]
    }
  });
});

app.post('/api/payments/stk-push', (req, res) => {
  console.log('STK Push request:', req.body);
  
  const { phoneNumber, amount } = req.body;
  
  if (!phoneNumber || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Phone number and amount are required'
    });
  }
  
  const transactionId = 'TXN' + Date.now();
  
  res.json({
    success: true,
    message: 'STK Push initiated successfully',
    data: {
      transactionId,
      message: 'Enter your MPesa PIN on your phone to complete payment'
    }
  });
});

app.post('/api/payments/process-pin', (req, res) => {
  console.log('PIN processing:', req.body);
  
  const { transactionId, pin } = req.body;
  
  if (!transactionId || !pin) {
    return res.status(400).json({
      success: false,
      message: 'Transaction ID and PIN are required'
    });
  }
  
  // Demo: Accept any 4-digit PIN
  if (pin.length === 4 && /^\d+$/.test(pin)) {
    res.json({
      success: true,
      message: 'Payment successful!',
      data: {
        receipt: 'MC' + Date.now(),
        transactionId,
        amount: 1000, // Example amount
        newBalance: 49000 // Example new balance
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid PIN. Please try again.'
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
✨ SERVER IS RUNNING!
📍 Port: ${PORT}
📡 Local: http://localhost:${PORT}

📋 Available Endpoints:
   📍 Health: http://localhost:${PORT}/health
   📍 Login: POST http://localhost:${PORT}/api/auth/login
   📍 Customers: GET http://localhost:${PORT}/api/customers
   📍 STK Push: POST http://localhost:${PORT}/api/payments/stk-push
   📍 Process PIN: POST http://localhost:${PORT}/api/payments/process-pin

🔐 Test Credentials:
   📧 Email: any email
   🔑 Password: any password

👥 Sample Customers:
   1. 📱 254712345678 - John Doe (Loan: Ksh 50,000)
   2. 📱 254723456789 - Jane Smith (Loan: Ksh 25,000)

💡 This is a working demo. You can test it immediately!
  `);
});