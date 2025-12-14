const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Import middleware - NOTE: it's 'authenticate' not 'auth'
const { authenticate } = require('../middleware/auth');

// For now, remove requireRole or create a simple one
// Since your auth.js doesn't export requireRole, we'll create a temporary one
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

// Apply authentication middleware to all routes
router.use(authenticate);

// Customer routes
router.get('/', customerController.getCustomers);
router.post('/', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), customerController.createCustomer);
router.get('/dashboard/stats', customerController.getDashboardStats);
router.get('/phone/:phoneNumber', customerController.getCustomerByPhone);
router.get('/:id', customerController.getCustomer);
router.put('/:id', requireRole('SUPERVISOR', 'ADMIN'), customerController.updateCustomer);
router.delete('/:id', requireRole('ADMIN'), customerController.deleteCustomer);

module.exports = router;