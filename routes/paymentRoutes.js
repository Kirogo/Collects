const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Import middleware - NOTE: it's 'authenticate' not 'auth'
const { authenticate } = require('../middleware/auth');

// Create requireRole function since it's not in auth.js
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

// Public callback endpoint
router.post('/callback', paymentController.mpesaCallback);

// Apply authentication middleware to all routes below
router.use(authenticate);

// Payment routes
router.post('/stk-push', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), paymentController.initiateSTKPush);
router.post('/process-pin', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), paymentController.processPin);
router.get('/status/:transactionId', paymentController.getTransactionStatus);
router.get('/transactions', paymentController.getTransactions);

module.exports = router;