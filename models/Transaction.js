// models/Transaction.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  transactionInternalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  customerInternalId: {
    type: String,
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Amount must be greater than 0']
  },
  description: {
    type: String,
    default: 'Loan Repayment',
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'], // ADDED EXPIRED
    default: 'PENDING',
    index: true
  },
  loanBalanceBefore: {
    type: Number,
    required: true,
    min: [0, 'Loan balance cannot be negative']
  },
  loanBalanceAfter: {
    type: Number,
    required: true,
    min: [0, 'Loan balance cannot be negative']
  },
  arrearsBefore: {
    type: Number,
    required: true,
    min: [0, 'Arrears cannot be negative']
  },
  arrearsAfter: {
    type: Number,
    required: true,
    min: [0, 'Arrears cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['MPESA', 'CASH', 'BANK_TRANSFER'],
    default: 'MPESA'
  },
  initiatedBy: {
    type: String,
    required: true
  },
  initiatedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mpesaReceiptNumber: {
    type: String,
    trim: true,
    sparse: true,
    index: true
  },
  stkPushResponse: {
    message: String,
    timestamp: Date
  },
  callbackData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  pinAttempts: {
    type: Number,
    default: 0,
    max: [3, 'Maximum pin attempts reached']
  },
  errorMessage: {
    type: String,
    trim: true
  },
  failureReason: { // NEW FIELD for failed transactions
    type: String,
    enum: ['INSUFFICIENT_FUNDS', 'TECHNICAL_ERROR', 'WRONG_PIN', 'USER_CANCELLED', 'NETWORK_ERROR', 'EXPIRED', 'OTHER'],
    trim: true
  },
  stkPushSentAt: { // NEW FIELD to track when STK push was sent
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
TransactionSchema.index({ customerId: 1, status: 1 });
TransactionSchema.index({ phoneNumber: 1, createdAt: -1 });
TransactionSchema.index({ createdAt: 1 });
TransactionSchema.index({ status: 1, stkPushSentAt: 1 }); // For checking expired transactions

// Static methods
TransactionSchema.statics.generateTransactionId = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN${timestamp.slice(-8)}${random}`;
};

TransactionSchema.statics.generateMpesaReceiptNumber = function() {
  const date = new Date();
  const dateStr = date.getFullYear().toString().slice(-2) + 
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `MC${dateStr}${random}`;
};

// Instance method to check if transaction is expired
TransactionSchema.methods.isExpired = function() {
  if (this.status !== 'PENDING') return false;
  
  const now = new Date();
  const stkSentAt = this.stkPushSentAt || this.createdAt;
  const thirtySecondsAgo = new Date(now.getTime() - 30000); // 30 seconds
  
  return stkSentAt < thirtySecondsAgo;
};

module.exports = mongoose.model('Transaction', TransactionSchema);