const express = require('express');
const router = express.Router();

// Simple test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Database status
router.get('/db-status', async (req, res) => {
  const { db } = require('../config/database');
  
  try {
    await db.read();
    const userCount = db.data.users.length;
    const customerCount = db.data.customers.length;
    const transactionCount = db.data.transactions.length;
    
    res.json({
      success: true,
      data: {
        users: userCount,
        customers: customerCount,
        transactions: transactionCount,
        databaseFile: 'db.json'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

module.exports = router;