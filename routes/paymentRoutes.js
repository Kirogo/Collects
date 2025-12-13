// BACKEND ROUTES - paymentRoutes.js
// This file defines routes for handling payment processing
// via MPesa STK Push for a banking application loan repayment system.
// It includes routes for initiating payments, processing PINs,
// checking transaction status, and retrieving transaction history.
// The routes are protected by authentication and role-based access control middleware.


const express = require('express');
const router = express.Router();

// Import controllers
const paymentController = require('../controllers/paymentController');
const { auth, requireRole } = require('../middleware/auth');

// Public callback endpoint
router.post('/callback', paymentController.mpesaCallback);

// Protected routes (staff only)
router.use(auth);

// Payment routes
router.post('/stk-push', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), paymentController.initiateSTKPush);
router.post('/process-pin', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), paymentController.processPin);
router.get('/status/:transactionId', paymentController.getTransactionStatus);
router.get('/transactions', paymentController.getTransactions);
// Optional: router.get('/dashboard', paymentController.getDashboardStats);

module.exports = router;