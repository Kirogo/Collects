const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// Public callback endpoint
router.post('/mpesa-callback', paymentController.mpesaCallback);

// Apply protect middleware to all routes below
router.use(protect);

// Define routes with .route() syntax
router.route('/initiate')
  .post(authorize('admin', 'supervisor', 'agent'), paymentController.initiateSTKPush);

router.route('/process-pin')
  .post(authorize('admin', 'supervisor', 'agent'), paymentController.processPin);

router.route('/transactions')
  .get(authorize('admin', 'supervisor', 'agent'), paymentController.getTransactions);

router.route('/mark-failed/:transactionId')
  .post(authorize('admin', 'supervisor'), paymentController.markTransactionFailed);

router.route('/dashboard/stats')
  .get(authorize('admin', 'supervisor'), paymentController.getDashboardStats);

router.route('/status/:transactionId')
  .get(authorize('admin', 'supervisor', 'agent'), paymentController.getTransactionStatus);

router.route('/transaction/:id')
  .get(authorize('admin', 'supervisor', 'agent'), paymentController.getTransactionById);

router.route('/cancel/:transactionId')
  .post(authorize('admin', 'supervisor'), paymentController.cancelTransaction);

router.route('/check-expired')
  .get(authorize('admin', 'supervisor'), paymentController.checkExpiredTransactions);

module.exports = router;