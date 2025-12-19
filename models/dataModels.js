// Simplified models for staff-only system
// for a banking application.
// Uses a simple JSON file database for data storage.
// Defines schemas for customers, transactions, and users.

const customerSchema = {
  id: '',
  phoneNumber: '',      // Customer's phone (for STK Push)
  name: '',
  customerId: '',       // Bank customer ID
  accountNumber: '',    // Loan account number
  loanBalance: 0,
  arrears: 0,           // Overdue amount
  lastPaymentDate: null,
  totalRepayments: 0,
  isActive: true,
  createdAt: '',
  updatedAt: ''
};

const transactionSchema = {
  id: '',
  transactionId: '',      // MPesa transaction reference
  customerId: '',         // Which customer paid
  customerName: '',       // For easy reference
  phoneNumber: '',        // Phone that received STK Push
  amount: 0,
  status: 'PENDING',      // PENDING, SUCCESS, FAILED
  description: '',        // e.g., "January Loan Repayment"
  initiatedBy: '',        // Staff username who initiated
  mpesaReceiptNumber: '',
  loanBalanceBefore: 0,
  loanBalanceAfter: 0,
  arrearsBefore: 0,
  arrearsAfter: 0,
  createdAt: '',
  updatedAt: ''
};

const userSchema = {
  id: '',
  username: '',           // Staff username
  email: '',
  password: '',           // Hashed
  fullName: '',           // Staff full name
  employeeId: '',         // Staff ID
  role: 'AGENT',        
  department: '',         // e.g., "Collections", "Customer Service"
  isActive: true,
  lastLogin: null,
  createdAt: '',
  updatedAt: ''
};

module.exports = {
  customerSchema,
  transactionSchema,
  userSchema
};