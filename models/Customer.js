const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  customerInternalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide a phone number'],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please provide customer name'],
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  loanBalance: {
    type: Number,
    required: true,
    min: [0, 'Loan balance cannot be negative'],
    default: 0
  },
  arrears: {
    type: Number,
    required: true,
    min: [0, 'Arrears cannot be negative'],
    default: 0
  },
  totalRepayments: {
    type: Number,
    default: 0,
    min: [0, 'Total repayments cannot be negative']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  nationalId: {
    type: String,
    trim: true,
    sparse: true
  },
  lastPaymentDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// REMOVE ALL THESE SINGLE FIELD INDEXES (keep only compound indexes)
// CustomerSchema.index({ phoneNumber: 1 });    // DELETE
// CustomerSchema.index({ customerId: 1 });     // DELETE  
// CustomerSchema.index({ name: 1 });           // DELETE
// CustomerSchema.index({ accountNumber: 1 });  // DELETE
// CustomerSchema.index({ isActive: 1 });       // DELETE

// Keep only compound indexes
CustomerSchema.index({ loanBalance: -1 });
CustomerSchema.index({ arrears: -1 });
CustomerSchema.index({ createdAt: -1 });

// Pre-save middleware
CustomerSchema.pre('save', function(next) {
  if (!this.customerId) {
    this.customerId = `CUST${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Customer', CustomerSchema);