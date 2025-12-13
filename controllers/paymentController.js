// Controller for handling payment processing via MPesa STK Push
// for a banking application loan repayment system.
// Uses a simple JSON file database for data storage.
// Includes functionalities for initiating payments, processing PINs,
// checking transaction status, and retrieving transaction history. 

const { getDB, generateId } = require('../config/database');

// Helper functions
const formatPhoneNumber = (phone) => {
  if (phone.startsWith('0')) {
    return '254' + phone.substring(1);
  } else if (phone.startsWith('254')) {
    return phone;
  } else if (phone.startsWith('+254')) {
    return phone.substring(1);
  } else {
    return '254' + phone;
  }
};

const generateTransactionId = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN${timestamp.slice(-8)}${random}`;
};

const generateMpesaReceiptNumber = () => {
  const date = new Date();
  const dateStr = date.getFullYear().toString().slice(-2) + 
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `MC${dateStr}${random}`;
};

/**
 * Initiate STK Push payment
 */
async function initiateSTKPush(req, res) {
  try {
    const db = getDB();
    await db.read();
    
    const { phoneNumber, amount, description = 'Loan Repayment' } = req.body;

    // Validation
    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and amount'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid amount greater than 0'
      });
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Find customer
    const customer = db.data.customers.find(
      customer => customer.phoneNumber === formattedPhone && customer.isActive
    );
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found. Please register customer first.'
      });
    }

    // Check loan balance
    if (amountNum > customer.loanBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (Ksh ${amountNum.toLocaleString()}) exceeds loan balance (Ksh ${customer.loanBalance.toLocaleString()})`
      });
    }

    // Generate transaction ID
    const transactionId = generateTransactionId();
    
    // Calculate new balance
    const newLoanBalance = customer.loanBalance - amountNum;
    const newArrears = Math.max(0, customer.arrears - amountNum);

    // Create transaction
    const transaction = {
      id: await generateId('TRN', 'lastTransactionId'),
      transactionId,
      customerId: customer.id,
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
      mpesaReceiptNumber: '',
      stkPushResponse: {
        message: 'STK Push initiated',
        timestamp: new Date().toISOString()
      },
      callbackData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save transaction
    db.data.transactions.push(transaction);
    await db.write();

    // Response
    res.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: {
        transaction,
        customer: {
          name: customer.name,
          phoneNumber: customer.phoneNumber,
          loanBalanceBefore: customer.loanBalance,
          loanBalanceAfter: newLoanBalance
        }
      }
    });

  } catch (error) {
    console.error('Initiate STK Push error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error initiating STK Push'
    });
  }
}

/**
 * Process MPesa PIN
 */
async function processPin(req, res) {
  try {
    const db = getDB();
    await db.read();
    
    const { transactionId, pin } = req.body;

    if (!transactionId || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction ID and PIN'
      });
    }

    // Find transaction
    const transactionIndex = db.data.transactions.findIndex(
      t => t.transactionId === transactionId
    );
    
    if (transactionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = db.data.transactions[transactionIndex];

    // Check if already processed
    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Transaction already ${transaction.status.toLowerCase()}`
      });
    }

    // Find customer
    const customerIndex = db.data.customers.findIndex(
      c => c.id === transaction.customerId
    );
    
    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate PIN (demo: accepts any 4-digit PIN)
    if (/^\d{4}$/.test(pin)) {
      // Successful payment
      const mpesaReceiptNumber = generateMpesaReceiptNumber();
      
      // Update transaction
      db.data.transactions[transactionIndex].status = 'SUCCESS';
      db.data.transactions[transactionIndex].mpesaReceiptNumber = mpesaReceiptNumber;
      db.data.transactions[transactionIndex].updatedAt = new Date().toISOString();

      // Update customer
      db.data.customers[customerIndex].loanBalance = transaction.loanBalanceAfter;
      db.data.customers[customerIndex].arrears = transaction.arrearsAfter;
      db.data.customers[customerIndex].totalRepayments += transaction.amount;
      db.data.customers[customerIndex].lastPaymentDate = new Date().toISOString();
      db.data.customers[customerIndex].updatedAt = new Date().toISOString();

      await db.write();

      // Response
      res.json({
        success: true,
        message: 'Payment successful!',
        data: {
          receipt: mpesaReceiptNumber,
          amount: transaction.amount,
          newLoanBalance: db.data.customers[customerIndex].loanBalance
        }
      });
    } else {
      // Failed payment
      db.data.transactions[transactionIndex].status = 'FAILED';
      db.data.transactions[transactionIndex].updatedAt = new Date().toISOString();
      await db.write();

      res.status(400).json({
        success: false,
        message: 'Invalid MPesa PIN. Please enter a valid 4-digit PIN.'
      });
    }
  } catch (error) {
    console.error('Process PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing payment'
    });
  }
}

/**
 * Get transaction status
 */
async function getTransactionStatus(req, res) {
  try {
    const db = getDB();
    await db.read();
    
    const transaction = db.data.transactions.find(
      t => t.transactionId === req.params.transactionId
    );

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
}

/**
 * Get all transactions
 */
async function getTransactions(req, res) {
  try {
    const db = getDB();
    await db.read();
    
    const transactions = db.data.transactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate summary
    const successful = transactions.filter(t => t.status === 'SUCCESS');
    const totalAmount = successful.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        transactions,
        summary: {
          total: transactions.length,
          successful: successful.length,
          totalAmount
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
}

/**
 * MPesa callback endpoint
 */
async function mpesaCallback(req, res) {
  try {
    console.log('📞 MPesa Callback received');
    
    // In real implementation, process the callback here
    res.json({
      success: true,
      message: 'Callback received successfully'
    });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing callback'
    });
  }
}

/**
 * Get dashboard statistics (optional)
 */
async function getDashboardStats(req, res) {
  try {
    const db = getDB();
    await db.read();
    
    const transactions = db.data.transactions;
    const successful = transactions.filter(t => t.status === 'SUCCESS');
    
    const stats = {
      totalTransactions: transactions.length,
      successfulTransactions: successful.length,
      totalAmountCollected: successful.reduce((sum, t) => sum + t.amount, 0)
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
}

// Export all functions
module.exports = {
  initiateSTKPush,
  processPin,
  getTransactionStatus,
  getTransactions,
  getDashboardStats,
  mpesaCallback
};