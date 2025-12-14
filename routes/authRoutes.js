const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login - Login with email or username
router.post('/login', authController.login);

// GET /api/auth/me - Get current user (protected)
router.get('/me', authenticate, authController.getCurrentUser);

// GET /api/auth/check - Health check
router.get('/check', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;