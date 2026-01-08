// controllers/paymentController.js

const cron = require('node-cron');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const { 
  formatPhoneNumber, 
  isValidKenyanPhone,
  calculateNewBalances 
} = require('../utils/helpers');

/**
 * @desc    Initiate STK Push payment
 * @route   POST /api/payments/initiate
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.initiateSTKPush = async (req, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();
  
  try {
    const { phoneNumber, amount, description = 'Loan Repayment' } = req.body;

    // Validation
    if (!phoneNumber || !amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and amount'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid amount greater than 0'
      });
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!isValidKenyanPhone(formattedPhone)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Kenyan phone number'
      });
    }

    // Find customer
    const customer = await Customer.findOne({
      phoneNumber: formattedPhone,
      isActive: true
    }).session(session);
    
    if (!customer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Customer not found. Please register customer first.'
      });
    }

    // Check loan balance
    if (amountNum > customer.loanBalance) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Payment amount (Ksh ${amountNum.toLocaleString()}) exceeds loan balance (Ksh ${customer.loanBalance.toLocaleString()})`
      });
    }

    // Generate transaction ID
    const transactionId = Transaction.generateTransactionId();
    const transactionInternalId = `TRN${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Calculate new balances
    const { newLoanBalance, newArrears } = calculateNewBalances(customer, amountNum);

    // Create transaction
    const transaction = await Transaction.create([{
      transactionInternalId,
      transactionId,
      customerId: customer._id,
      customerInternalId: customer.customerInternalId,
      phoneNumber: formattedPhone,
      amount: amountNum,
      description,
      status: 'PENDING',
      loanBalanceBefore: customer.loanBalance,
      loanBalanceAfter: newLoanBalance,
      arrearsBefore: customer.arrears,
      arrearsAfter: newArrears,
      paymentMethod: 'MPESA',
      initiatedBy: req.user.username,
      initiatedByUserId: req.user.id,
      stkPushResponse: {
        message: 'STK Push initiated',
        timestamp: new Date()
      }
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Response
    res.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: {
        transaction: transaction[0],
        customer: {
          name: customer.name,
          phoneNumber: customer.phoneNumber,
          loanBalanceBefore: customer.loanBalance,
          loanBalanceAfter: newLoanBalance,
          arrearsBefore: customer.arrears,
          arrearsAfter: newArrears
        }
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Initiate STK Push error:', error);
    
    // Handle duplicate transaction ID (rare case)
    if (error.code === 11000 && error.keyPattern?.transactionId) {
      return res.status(409).json({
        success: false,
        message: 'Transaction ID conflict. Please try again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error initiating STK Push'
    });
  }
};

/**
 * @desc    Process MPesa PIN
 * @route   POST /api/payments/process-pin
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.processPin = async (req, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();
  
  try {
    const { transactionId, pin } = req.body;

    if (!transactionId || !pin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction ID and PIN'
      });
    }

    // Find transaction with customer data
    const transaction = await Transaction.findOne({
      transactionId: transactionId
    }).populate('customerId').session(session);
    
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if already processed
    if (transaction.status !== 'PENDING') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Transaction already ${transaction.status.toLowerCase()}`
      });
    }

    // Check pin attempts
    if (transaction.pinAttempts >= 3) {
      transaction.status = 'FAILED';
      transaction.errorMessage = 'Maximum PIN attempts exceeded';
      transaction.updatedAt = new Date();
      await transaction.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Maximum PIN attempts exceeded. Transaction failed.'
      });
    }

    // Find customer
    const customer = await Customer.findById(transaction.customerId._id).session(session);
    if (!customer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate PIN (demo: accepts any 4-digit PIN)
    // In production, this would integrate with actual MPesa API
    if (/^\d{4,6}$/.test(pin)) {
      // Successful payment
      const mpesaReceiptNumber = Transaction.generateMpesaReceiptNumber();
      
      // Update transaction
      transaction.status = 'SUCCESS';
      transaction.mpesaReceiptNumber = mpesaReceiptNumber;
      transaction.processedAt = new Date();
      transaction.updatedAt = new Date();
      transaction.pinAttempts += 1;
      
      // Update customer
      customer.loanBalance = transaction.loanBalanceAfter;
      customer.arrears = transaction.arrearsAfter;
      customer.totalRepayments += transaction.amount;
      customer.lastPaymentDate = new Date();
      customer.updatedAt = new Date();
      
      // Save both in transaction
      await transaction.save({ session });
      await customer.save({ session });
      
      await session.commitTransaction();
      session.endSession();

      // Response
      res.json({
        success: true,
        message: 'Payment successful!',
        data: {
          receipt: mpesaReceiptNumber,
          amount: transaction.amount,
          newLoanBalance: customer.loanBalance,
          newArrears: customer.arrears,
          transactionId: transaction.transactionId,
          transactionDate: transaction.processedAt
        }
      });
    } else {
      // Failed payment - increment attempt counter
      transaction.pinAttempts += 1;
      transaction.updatedAt = new Date();
      
      // Check if this was the final attempt
      if (transaction.pinAttempts >= 3) {
        transaction.status = 'FAILED';
        transaction.errorMessage = 'Maximum PIN attempts exceeded';
      }
      
      await transaction.save({ session });
      await session.commitTransaction();
      session.endSession();

      const attemptsLeft = 3 - transaction.pinAttempts;
      
      res.status(400).json({
        success: false,
        message: `Invalid MPesa PIN. ${attemptsLeft > 0 ? `You have ${attemptsLeft} attempt(s) left.` : 'Maximum attempts exceeded.'}`,
        data: {
          attemptsLeft: Math.max(0, attemptsLeft)
        }
      });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Process PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing payment'
    });
  }
};

/**
 * @desc    Get transaction status
 * @route   GET /api/payments/status/:transactionId
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.getTransactionStatus = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId
    }).populate('customerId', 'name phoneNumber').select('-__v');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching transaction status'
    });
  }
};

/**
 * @desc    Get all transactions with pagination and filtering
 * @route   GET /api/payments/transactions
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.getTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      status,
      startDate,
      endDate,
      customerId,
      phoneNumber
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (customerId) {
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
    
    if (phoneNumber) {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      query.phoneNumber = formattedPhone;
    }
    
    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Execute queries in parallel
    const [transactions, total, successful, totalAmount] = await Promise.all([
      Transaction.find(query)
        .populate('customerId', 'name phoneNumber customerId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-__v'),
      Transaction.countDocuments(query),
      Transaction.countDocuments({ ...query, status: 'SUCCESS' }),
      Transaction.aggregate([
        { $match: { ...query, status: 'SUCCESS' } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
      ])
    ]);
    
    const summaryAmount = totalAmount[0] ? totalAmount[0].totalAmount : 0;
    
    res.json({
      success: true,
      data: {
        transactions,
        summary: {
          total,
          successful,
          totalAmount: summaryAmount,
          successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0
        },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching transactions'
    });
  }
};

/**
 * @desc    MPesa callback endpoint (for real MPesa integration)
 * @route   POST /api/payments/mpesa-callback
 * @access  Public (Called by Safaricom)
 */
exports.mpesaCallback = async (req, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();
  
  try {
    console.log('📞 MPesa Callback received:', JSON.stringify(req.body, null, 2));
    
    const callbackData = req.body;
    
    // In real implementation, you would:
    // 1. Validate the callback signature
    // 2. Extract transaction details
    // 3. Update transaction status
    // 4. Update customer balance
    
    // Example structure for MPesa callback
    // {
    //   "Body": {
    //     "stkCallback": {
    //       "MerchantRequestID": "29115-34620561-1",
    //       "CheckoutRequestID": "ws_CO_191220191020363741",
    //       "ResultCode": 0,
    //       "ResultDesc": "The service request is processed successfully.",
    //       "CallbackMetadata": {
    //         "Item": [
    //           { "Name": "Amount", "Value": 1 },
    //           { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
    //           { "Name": "TransactionDate", "Value": 20191219102115 },
    //           { "Name": "PhoneNumber", "Value": 254708374149 }
    //         ]
    //       }
    //     }
    //   }
    // }
    
    // For now, just acknowledge receipt
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      success: true,
      message: 'Callback received successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing callback'
    });
  }
};

/**
 * @desc    Check and expire old pending transactions (cron job)
 * @route   N/A (Runs automatically)
 * @access  Private (System)
 */
exports.checkExpiredTransactions = async () => {
  try {
    const thirtySecondsAgo = new Date(Date.now() - 30000); // 30 seconds
    
    const expiredTransactions = await Transaction.find({
      status: 'PENDING',
      stkPushSentAt: { $lt: thirtySecondsAgo }
    });

    if (expiredTransactions.length > 0) {
      console.log(`Found ${expiredTransactions.length} expired transactions`);
      
      for (const transaction of expiredTransactions) {
        transaction.status = 'EXPIRED';
        transaction.failureReason = 'EXPIRED';
        transaction.errorMessage = 'STK Push expired (30 seconds) - Customer did not enter PIN';
        transaction.updatedAt = new Date();
        await transaction.save();
      }
    }
  } catch (error) {
    console.error('Error checking expired transactions:', error);
  }
};

/**
 * @desc    Get transaction status with detailed failure reasons
 * @route   GET /api/payments/status/:transactionId
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.getTransactionStatus = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId
    }).populate('customerId', 'name phoneNumber').select('-__v');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if transaction is expired (for real-time status)
    if (transaction.status === 'PENDING' && transaction.isExpired()) {
      transaction.status = 'EXPIRED';
      transaction.failureReason = 'EXPIRED';
      transaction.errorMessage = 'STK Push expired (30 seconds) - Customer did not enter PIN';
      transaction.updatedAt = new Date();
      await transaction.save();
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching transaction status'
    });
  }
};

// Update the processPin function to handle failure reasons better:
/**
 * @desc    Process MPesa PIN
 * @route   POST /api/payments/process-pin
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.processPin = async (req, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();
  
  try {
    const { transactionId, pin, failureReason } = req.body; // Added failureReason

    if (!transactionId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction ID'
      });
    }

    // Find transaction with customer data
    const transaction = await Transaction.findOne({
      transactionId: transactionId
    }).populate('customerId').session(session);
    
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if expired
    if (transaction.status === 'PENDING' && transaction.isExpired()) {
      transaction.status = 'EXPIRED';
      transaction.failureReason = 'EXPIRED';
      transaction.errorMessage = 'STK Push expired (30 seconds) - Customer did not enter PIN';
      transaction.updatedAt = new Date();
      await transaction.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Transaction has expired. Please initiate a new payment.'
      });
    }

    // Check if already processed
    if (transaction.status !== 'PENDING') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Transaction already ${transaction.status.toLowerCase()}`
      });
    }

    // If failureReason is provided (for manual failure marking)
    if (failureReason) {
      transaction.status = 'FAILED';
      transaction.failureReason = failureReason;
      transaction.errorMessage = getFailureMessage(failureReason);
      transaction.updatedAt = new Date();
      await transaction.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return res.json({
        success: true,
        message: 'Transaction marked as failed',
        data: { transaction }
      });
    }

    // Check pin attempts
    if (transaction.pinAttempts >= 3) {
      transaction.status = 'FAILED';
      transaction.failureReason = 'WRONG_PIN';
      transaction.errorMessage = 'Maximum PIN attempts exceeded';
      transaction.updatedAt = new Date();
      await transaction.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Maximum PIN attempts exceeded. Transaction failed.'
      });
    }

    // Find customer
    const customer = await Customer.findById(transaction.customerId._id).session(session);
    if (!customer) {
      transaction.status = 'FAILED';
      transaction.failureReason = 'TECHNICAL_ERROR';
      transaction.errorMessage = 'Customer not found';
      transaction.updatedAt = new Date();
      await transaction.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate PIN (demo: accepts any 4-digit PIN)
    // In production, this would integrate with actual MPesa API
    if (pin && /^\d{4,6}$/.test(pin)) {
      // Simulate different scenarios for demo purposes
      const random = Math.random();
      
      // 70% chance of success
      if (random < 0.7) {
        // Successful payment
        const mpesaReceiptNumber = Transaction.generateMpesaReceiptNumber();
        
        // Update transaction
        transaction.status = 'SUCCESS';
        transaction.mpesaReceiptNumber = mpesaReceiptNumber;
        transaction.processedAt = new Date();
        transaction.updatedAt = new Date();
        transaction.pinAttempts += 1;
        
        // Update customer
        customer.loanBalance = transaction.loanBalanceAfter;
        customer.arrears = transaction.arrearsAfter;
        customer.totalRepayments += transaction.amount;
        customer.lastPaymentDate = new Date();
        customer.updatedAt = new Date();
        
        // Save both in transaction
        await transaction.save({ session });
        await customer.save({ session });
        
        await session.commitTransaction();
        session.endSession();

        // Response
        res.json({
          success: true,
          message: 'Payment successful!',
          data: {
            receipt: mpesaReceiptNumber,
            amount: transaction.amount,
            newLoanBalance: customer.loanBalance,
            newArrears: customer.arrears,
            transactionId: transaction.transactionId,
            transactionDate: transaction.processedAt
          }
        });
      } 
      // 15% chance of insufficient funds
      else if (random < 0.85) {
        transaction.status = 'FAILED';
        transaction.failureReason = 'INSUFFICIENT_FUNDS';
        transaction.errorMessage = 'Customer has insufficient funds in their MPESA account';
        transaction.pinAttempts += 1;
        transaction.updatedAt = new Date();
        
        await transaction.save({ session });
        await session.commitTransaction();
        session.endSession();

        res.status(400).json({
          success: false,
          message: 'Payment failed: Insufficient funds in customer\'s MPESA account',
          data: {
            failureReason: 'INSUFFICIENT_FUNDS',
            attemptsLeft: Math.max(0, 3 - transaction.pinAttempts)
          }
        });
      }
      // 15% chance of technical error
      else {
        transaction.status = 'FAILED';
        transaction.failureReason = 'TECHNICAL_ERROR';
        transaction.errorMessage = 'Technical error occurred during payment processing';
        transaction.pinAttempts += 1;
        transaction.updatedAt = new Date();
        
        await transaction.save({ session });
        await session.commitTransaction();
        session.endSession();

        res.status(400).json({
          success: false,
          message: 'Payment failed due to technical error. Please try again.',
          data: {
            failureReason: 'TECHNICAL_ERROR',
            attemptsLeft: Math.max(0, 3 - transaction.pinAttempts)
          }
        });
      }
    } else {
      // Failed payment - increment attempt counter
      transaction.pinAttempts += 1;
      transaction.updatedAt = new Date();
      
      // Check if this was the final attempt
      if (transaction.pinAttempts >= 3) {
        transaction.status = 'FAILED';
        transaction.failureReason = 'WRONG_PIN';
        transaction.errorMessage = 'Maximum PIN attempts exceeded';
      }
      
      await transaction.save({ session });
      await session.commitTransaction();
      session.endSession();

      const attemptsLeft = 3 - transaction.pinAttempts;
      
      res.status(400).json({
        success: false,
        message: `Invalid MPesa PIN. ${attemptsLeft > 0 ? `You have ${attemptsLeft} attempt(s) left.` : 'Maximum attempts exceeded.'}`,
        data: {
          attemptsLeft: Math.max(0, attemptsLeft),
          failureReason: attemptsLeft > 0 ? 'WRONG_PIN' : 'MAX_ATTEMPTS_EXCEEDED'
        }
      });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Process PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing payment'
    });
  }
};

// Helper function for failure messages
function getFailureMessage(failureReason) {
  const messages = {
    'INSUFFICIENT_FUNDS': 'Customer has insufficient funds in their MPESA account',
    'TECHNICAL_ERROR': 'Technical error occurred during payment processing',
    'WRONG_PIN': 'Incorrect MPESA PIN entered',
    'USER_CANCELLED': 'Customer cancelled the payment',
    'NETWORK_ERROR': 'Network error occurred',
    'EXPIRED': 'STK Push expired (30 seconds) - Customer did not enter PIN',
    'OTHER': 'Payment failed due to unknown reasons'
  };
  
  return messages[failureReason] || 'Payment failed';
}

/**
 * @desc    Mark transaction as failed with specific reason
 * @route   POST /api/payments/mark-failed/:transactionId
 * @access  Private (Admin, Supervisor)
 */
exports.markTransactionFailed = async (req, res) => {
  try {
    const { failureReason } = req.body;
    
    if (!failureReason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a failure reason'
      });
    }

    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      status: 'PENDING'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Pending transaction not found'
      });
    }

    transaction.status = 'FAILED';
    transaction.failureReason = failureReason;
    transaction.errorMessage = getFailureMessage(failureReason);
    transaction.updatedAt = new Date();
    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction marked as failed',
      data: { transaction }
    });
  } catch (error) {
    console.error('Mark transaction failed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking transaction as failed'
    });
  }
};

// Add this to your routes file (usually routes/paymentRoutes.js) or in the controller setup
// Schedule cron job to check for expired transactions every 10 seconds
cron.schedule('*/10 * * * * *', () => {
  console.log('Checking for expired transactions...');
  exports.checkExpiredTransactions();
});

/**
 * @desc    Get payment dashboard statistics
 * @route   GET /api/payments/dashboard/stats
 * @access  Private (Admin, Supervisor)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Calculate stats for different time periods
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);
    
    const [todayStats, yesterdayStats, last7DaysStats, last30DaysStats, totalStats] = await Promise.all([
      // Today's stats
      Transaction.aggregate([
        {
          $match: {
            status: 'SUCCESS',
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Yesterday's stats
      Transaction.aggregate([
        {
          $match: {
            status: 'SUCCESS',
            createdAt: { $gte: yesterday, $lt: today }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Last 7 days stats
      Transaction.aggregate([
        {
          $match: {
            status: 'SUCCESS',
            createdAt: { $gte: last7Days }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Last 30 days stats
      Transaction.aggregate([
        {
          $match: {
            status: 'SUCCESS',
            createdAt: { $gte: last30Days }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Total stats
      Transaction.aggregate([
        { $match: { status: 'SUCCESS' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Get recent successful transactions
    const recentTransactions = await Transaction.find({ status: 'SUCCESS' })
      .populate('customerId', 'name phoneNumber')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('transactionId amount description createdAt');

    const stats = {
      today: {
        totalAmount: todayStats[0]?.totalAmount || 0,
        count: todayStats[0]?.count || 0
      },
      yesterday: {
        totalAmount: yesterdayStats[0]?.totalAmount || 0,
        count: yesterdayStats[0]?.count || 0
      },
      last7Days: {
        totalAmount: last7DaysStats[0]?.totalAmount || 0,
        count: last7DaysStats[0]?.count || 0
      },
      last30Days: {
        totalAmount: last30DaysStats[0]?.totalAmount || 0,
        count: last30DaysStats[0]?.count || 0
      },
      allTime: {
        totalAmount: totalStats[0]?.totalAmount || 0,
        count: totalStats[0]?.count || 0
      },
      recentTransactions
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard statistics'
    });
  }
};

/**
 * @desc    Get transaction by ID
 * @route   GET /api/payments/transaction/:id
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      $or: [
        { _id: req.params.id },
        { transactionId: req.params.id },
        { transactionInternalId: req.params.id }
      ]
    })
    .populate('customerId', 'name phoneNumber customerId accountNumber')
    .populate('initiatedByUserId', 'username email role')
    .select('-__v');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error fetching transaction'
    });
  }
};

/**
 * @desc    Cancel a pending transaction
 * @route   POST /api/payments/cancel/:transactionId
 * @access  Private (Admin, Supervisor)
 */
exports.cancelTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      status: 'PENDING'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Pending transaction not found or already processed'
      });
    }

    transaction.status = 'CANCELLED';
    transaction.updatedAt = new Date();
    transaction.errorMessage = 'Cancelled by administrator';
    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction cancelled successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling transaction'
    });
  }
};