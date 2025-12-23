// server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const commentRoutes = require('./routes/commentRoutes');

// Import routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { frontendDebug, apiResponseFormatter } = require('./middleware/frontendDebug');

const app = express();

// Middleware
app.use(cors());
app.use(frontendDebug);
app.use(apiResponseFormatter);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', commentRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Transactions endpoint (temporary - should be in paymentRoutes)
// Add these routes to your server.js BEFORE the 404 handler

// 1. Transactions endpoint (frontend expects /api/transactions?customerId=xxx)
app.get('/api/transactions', async (req, res) => {
  try {
    const { customerId, limit = 10 } = req.query;
    
    const Transaction = require('./models/Transaction');
    let query = {};
    
    // Handle undefined customerId gracefully
    if (customerId && customerId !== 'undefined' && customerId !== 'null') {
      const Customer = require('./models/Customer');
      
      // Try to find customer by various identifiers
      const customer = await Customer.findOne({
        $or: [
          { _id: customerId },
          { customerId: customerId },
          { customerInternalId: customerId }
        ]
      });
      
      if (customer) {
        query.customerId = customer._id;
      }
    }
    
    const transactions = await Transaction.find(query)
      .populate('customerId', 'name phoneNumber customerId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');
    
    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions'
    });
  }
});

// 2. Customer comments endpoint
app.get('/api/customers/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle undefined ID
    if (!id || id === 'undefined') {
      return res.json({
        success: true,
        message: 'No customer ID provided',
        data: { comments: [] }
      });
    }
    
    // For now, return empty array - implement comments later
    res.json({
      success: true,
      message: 'Comments retrieved successfully',
      data: { comments: [] }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments'
    });
  }
});

// 3. POST endpoint for saving comments
app.post('/api/customers/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, type = 'follow_up', author } = req.body;
    
    if (!id || id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
    }
    
    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }
    
    // For now, just acknowledge the comment
    // You can save to MongoDB later
    res.json({
      success: true,
      message: 'Comment saved successfully',
      data: {
        commentId: `comment_${Date.now()}`,
        comment,
        author: author || 'Agent',
        createdAt: new Date().toISOString(),
        type
      }
    });
  } catch (error) {
    console.error('Save comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving comment'
    });
  }
});

// 4. Customer statement export endpoint (placeholder)
app.get('/api/customers/:id/statement', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
    }
    
    // Create a simple CSV statement for now
    const Customer = require('./models/Customer');
    const Transaction = require('./models/Transaction');
    
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    const transactions = await Transaction.find({ customerId: id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Create CSV content
    const csvHeader = 'Date,Description,Amount,Status,Type\n';
    const csvRows = transactions.map(t => 
      `${new Date(t.createdAt).toLocaleDateString()},"${t.description || 'Loan Repayment'}",${t.amount},${t.status},${t.paymentMethod}`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=statement_${customer.customerId}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export statement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting statement'
    });
  }
});

// Update the customers export endpoint
app.get('/api/customers/export', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Verify token (simplified - you should use your auth middleware)
    const jwt = require('jsonwebtoken');
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    const Customer = require('./models/Customer');
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    
    // Create CSV content
    const csvHeader = 'Customer ID,Name,Phone,Email,National ID,Account Number,Loan Balance,Arrears,Status,Created Date\n';
    const csvRows = customers.map(c => {
      const status = c.arrears === 0 ? 'Current' : 
                     c.arrears <= 1000 ? 'Warning' : 'Delinquent';
      const createdAt = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-KE') : '';
      
      // Escape commas and quotes in fields
      const escapeCSV = (field) => {
        if (!field) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };
      
      return [
        c.customerId || '',
        escapeCSV(c.name),
        c.phoneNumber || '',
        escapeCSV(c.email || ''),
        c.nationalId || '',
        c.accountNumber || '',
        parseFloat(c.loanBalance || 0).toFixed(2),
        parseFloat(c.arrears || 0).toFixed(2),
        status,
        createdAt
      ].join(',');
    });
    
    const csvContent = csvHeader + csvRows.join('\n');
    
    // Set proper headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting customers'
    });
  }
});

// Add authentication middleware function
const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // You can attach user info to request
    req.user = decoded;
    next();
    
  } catch (error) {
    console.error('Auth error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Apply authentication to protected routes
app.get('/api/customers', authenticateToken, async (req, res) => {
  // Your existing customers route logic
});

app.get('/api/customers/export', authenticateToken, async (req, res) => {
  // Your export logic
});

// In server.js, update the /api/transactions endpoint:

app.get('/api/transactions', async (req, res) => {
  try {
    const { customerId, limit = 10 } = req.query;
    
    console.log(`🔍 /api/transactions called with customerId: ${customerId}`);
    
    const Transaction = require('./models/Transaction');
    let query = {};
    
    // Handle undefined customerId gracefully
    if (customerId && customerId !== 'undefined' && customerId !== 'null') {
      const Customer = require('./models/Customer');
      let customer;
      
      // Try to find customer by various identifiers
      if (mongoose.Types.ObjectId.isValid(customerId)) {
        customer = await Customer.findById(customerId);
      }
      
      if (!customer) {
        customer = await Customer.findOne({ customerId: customerId });
      }
      
      if (!customer) {
        customer = await Customer.findOne({ customerInternalId: customerId });
      }
      
      if (!customer) {
        customer = await Customer.findOne({ phoneNumber: customerId });
      }
      
      if (customer) {
        query.customerId = customer._id;
        console.log(`✅ Found customer: ${customer.name}, using _id: ${customer._id}`);
      } else {
        console.log(`⚠️ Customer not found with ID: ${customerId}`);
      }
    }
    
    const transactions = await Transaction.find(query)
      .populate('customerId', 'name phoneNumber customerId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');
    
    console.log(`✅ Found ${transactions.length} transactions`);
    
    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions'
    });
  }
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});