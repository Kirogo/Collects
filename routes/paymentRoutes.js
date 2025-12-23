const express = require('express');
const router = express.Router();
const {
  initiateSTKPush,
  processPin,
  getTransactionStatus,
  getTransactions,
  getDashboardStats,
  mpesaCallback,
  getTransactionById,
  cancelTransaction
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// Public callback endpoint (no auth required)
router.post('/mpesa-callback', mpesaCallback);

// All other routes are protected
router.use(protect);

// Payment routes
router.route('/initiate')
  .post(authorize('admin', 'supervisor', 'agent'), initiateSTKPush);

router.route('/process-pin')
  .post(authorize('admin', 'supervisor', 'agent'), processPin);

router.route('/transactions')
  .get(authorize('admin', 'supervisor', 'agent'), getTransactions);

router.route('/dashboard/stats')
  .get(authorize('admin', 'supervisor'), getDashboardStats);

router.route('/status/:transactionId')
  .get(authorize('admin', 'supervisor', 'agent'), getTransactionStatus);

router.route('/transaction/:id')
  .get(authorize('admin', 'supervisor', 'agent'), getTransactionById);

router.route('/cancel/:transactionId')
  .post(authorize('admin', 'supervisor'), cancelTransaction);

module.exports = router;