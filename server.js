require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, db } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Initialize Express
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toLocaleTimeString()}`);
  next();
});

// Root endpoint - accessible before DB connection
app.get('/', (req, res) => {
  res.json({
    message: 'STK Push Loan Repayment System API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check - accessible before DB connection
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'STK Push Loan Repayment System',
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'connecting'
  });
});

// Initialize server
const startServer = async () => {
  try {
    console.log('🚀 Starting STK Push Loan Repayment System...');
    
    // Connect to database
    await connectDB();
    
    // Setup routes
    app.use('/api/auth', authRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/payments', paymentRoutes);
    
    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });
    
    // Error handler
    app.use(errorHandler);
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`
✅ Server is running on port ${PORT}
📚 Available endpoints:
   - Health: http://localhost:${PORT}/health
   - API Docs: http://localhost:${PORT}/
   - Login: POST http://localhost:${PORT}/api/auth/login
   
🔑 Default Credentials:
   Admin: admin@ncbabank.co.ke / Admin@2024
   Supervisor: supervisor@ncbabank.co.ke / Super@2024
   Agent: agent1@ncbabank.co.ke / Agent@2024
   
👥 Sample Customers (for testing):
   1. 254712345678 - John Kamau
   2. 254723456789 - Mary Wanjiku
   3. 254734567890 - Peter Ochieng
   
📁 Database file: backend/db.json
`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();