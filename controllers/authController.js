// Controller for user authentication and profile management
// for a banking application staff management system.
// Uses bcrypt for password hashing and JWT for token generation.
// Database operations are handled via a simple JSON file database.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB, generateId } = require('../config/database');

/**
 * Generate JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

/**
 * @desc    Register new user (bank staff)
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const { 
      username, 
      email, 
      password, 
      fullName, 
      employeeId, 
      role = 'AGENT', 
      department = 'Collections' 
    } = req.body;

    // Validation
    if (!username || !email || !password || !fullName || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: username, email, password, fullName, employeeId'
      });
    }

    // Check if user exists
    const userExists = db.data.users.find(
      user => user.email.toLowerCase() === email.toLowerCase() || 
              user.username === username ||
              user.employeeId === employeeId
    );
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, username, or employee ID already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user object
    const userId = generateId('USR', 'lastUserId');
    const newUser = {
      id: userId,
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName,
      employeeId,
      role: ['ADMIN', 'SUPERVISOR', 'AGENT'].includes(role) ? role : 'AGENT',
      department,
      isActive: true,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to database
    db.data.users.push(newUser);
    await db.write();

    // Generate token (without password)
    const { password: _, ...userWithoutPassword } = newUser;
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email (case insensitive)
    const user = db.data.users.find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
    
    console.log('Login attempt for:', email);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Debug: Show password comparison
    console.log('Stored password hash:', user.password.substring(0, 20) + '...');
    console.log('Password starts with $2a$:', user.password.startsWith('$2a$'));
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    await db.write();

    // Generate token
    const { password: _, ...userWithoutPassword } = user;
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Login error details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    // Find user by id (from auth middleware)
    const user = db.data.users.find(user => user.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};

/**
 * @desc    Get all staff users (Admin only)
 * @route   GET /api/auth/staff
 * @access  Private (Admin only)
 */
exports.getStaff = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    // Get all users, remove passwords
    const staff = db.data.users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      success: true,
      data: {
        staff,
        count: staff.length
      }
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching staff'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const userId = req.user.id;
    const { fullName, department, currentPassword, newPassword } = req.body;

    // Find user
    const userIndex = db.data.users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = db.data.users[userIndex];

    // Update basic info
    if (fullName) user.fullName = fullName;
    if (department) user.department = department;
    user.updatedAt = new Date().toISOString();

    // Update password if provided
    if (currentPassword && newPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    db.data.users[userIndex] = user;
    await db.write();

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};