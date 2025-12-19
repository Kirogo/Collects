// middleware/auth.js - UPDATED
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');

exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Auth header:', authHeader);
    
    if (!authHeader) {
      console.log('No authorization header');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted:', token.substring(0, 20) + '...');
    
    if (!token) {
      console.log('No token after Bearer');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'stk-push-system-secret-2024-change-in-production'
    );

    console.log('Token decoded:', decoded);

    // Get user from database
    const db = getDB();
    await db.read();
    
    const user = db.data.users.find(u => u.id === decoded.id);
    
    if (!user) {
      console.log('User not found in DB with id:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      console.log('User is deactivated:', user.username);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Attach user to request
    req.user = user;
    console.log('User authenticated:', user.username);
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    console.error('Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};