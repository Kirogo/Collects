const express = require('express');
const router = express.Router();
const { 
  login, 
  getCurrentUser, 
  logout, 
  register,
  debugUsers 
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/login', login);

// Protected routes
router.use(protect);

router.get('/me', getCurrentUser);
router.post('/logout', logout);

// Admin only routes
router.post('/register', authorize('admin'), register);
router.get('/debug', authorize('admin'), debugUsers);

module.exports = router;