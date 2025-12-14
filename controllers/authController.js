const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

const authController = {
  // Login endpoint
  login: async (req, res) => {
    try {
      console.log('📱 Login request received');
      console.log('Request body:', req.body);
      
      const { email, username, password } = req.body;
      
      // Validate input
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }
      
      const identifier = email || username;
      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Email or username is required'
        });
      }
      
      // Read users from db.json
      const dbPath = path.join(__dirname, '../db.json');
      const data = await fs.readFile(dbPath, 'utf8');
      const db = JSON.parse(data);
      const users = db.users || [];
      
      console.log(`Found ${users.length} users in database`);
      
      // Find user
      const user = users.find(u => 
        (u.email && u.email === identifier) || 
        (u.username && u.username === identifier) ||
        (u.email && u.email.toLowerCase() === identifier.toLowerCase()) ||
        (u.username && u.username.toLowerCase() === identifier.toLowerCase())
      );
      
      if (!user) {
        console.log(`User not found: ${identifier}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid email/username or password'
        });
      }
      
      // Check password
      if (user.password !== password) {
        console.log(`Invalid password for: ${identifier}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid email/username or password'
        });
      }
      
      // Generate token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          name: user.name
        },
        process.env.JWT_SECRET || 'ncba-collections-secret-key',
        { expiresIn: '8h' }
      );
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      console.log(`✅ Login successful for: ${user.email}`);
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userWithoutPassword
      });
      
    } catch (error) {
      console.error('🔥 Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: error.message
      });
    }
  },
  
  // Get current user
  getCurrentUser: (req, res) => {
    res.json({
      success: true,
      user: req.user || null
    });
  }
};

// Make sure to export properly
module.exports = authController;