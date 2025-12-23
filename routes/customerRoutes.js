const express = require('express');
const router = express.Router();
const {
  createCustomer,
  getCustomers,
  getCustomer,
  getCustomerByPhone,
  updateCustomer,
  deleteCustomer,
  getDashboardStats
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Routes
router.route('/')
  .post(authorize('admin', 'supervisor', 'agent'), createCustomer)
  .get(authorize('admin', 'supervisor', 'agent'), getCustomers);

router.route('/dashboard/stats')
  .get(authorize('admin', 'supervisor'), getDashboardStats);

router.route('/phone/:phoneNumber')
  .get(authorize('admin', 'supervisor', 'agent'), getCustomerByPhone);

router.route('/:id')
  .get(authorize('admin', 'supervisor', 'agent'), getCustomer)
  .put(authorize('admin', 'supervisor'), updateCustomer)
  .delete(authorize('admin'), deleteCustomer);

module.exports = router;