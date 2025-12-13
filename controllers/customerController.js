// Controller for managing loan customers in a banking application.
// Uses a simple JSON file database for data storage.
// Includes functionalities for creating, retrieving, updating, and deleting customers,
// as well as fetching dashboard statistics.
// Helper functions for phone number formatting and account number generation.
//


const { getDB, generateId } = require('../config/database');

/**
 * Helper function to format phone number
 */
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

/**
 * Generate account number
 */
const generateAccountNumber = () => {
  return 'LOAN' + Math.floor(1000000 + Math.random() * 9000000).toString();
};

/**
 * @desc    Create new loan customer
 * @route   POST /api/customers
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.createCustomer = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const { 
      phoneNumber, 
      name, 
      loanBalance = 0, 
      arrears = 0,
      email = '',
      nationalId = '',
      customerId,
      accountNumber
    } = req.body;

    // Validation
    if (!phoneNumber || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and name'
      });
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Check if customer already exists
    const existingCustomer = db.data.customers.find(
      customer => customer.phoneNumber === formattedPhone
    );
    
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    // Generate IDs
    const customerInternalId = generateId('CUS', 'lastCustomerInternalId');
    const finalCustomerId = customerId || `CUST${Date.now().toString().slice(-6)}`;
    const finalAccountNumber = accountNumber || generateAccountNumber();

    // Create customer object
    const newCustomer = {
      id: customerInternalId,
      phoneNumber: formattedPhone,
      name,
      customerId: finalCustomerId,
      accountNumber: finalAccountNumber,
      loanBalance: parseFloat(loanBalance),
      arrears: parseFloat(arrears),
      email,
      nationalId,
      totalRepayments: 0,
      lastPaymentDate: null,
      isActive: true,
      createdBy: req.user.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to database
    db.data.customers.push(newCustomer);
    await db.write();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        customer: newCustomer
      }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating customer'
    });
  }
};

/**
 * @desc    Get all customers with search and pagination
 * @route   GET /api/customers
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.getCustomers = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const { 
      search = '', 
      page = 1, 
      limit = 20,
      status = 'active'
    } = req.query;
    
    let customers = [...db.data.customers];

    // Filter by status
    if (status === 'active') {
      customers = customers.filter(c => c.isActive);
    } else if (status === 'inactive') {
      customers = customers.filter(c => !c.isActive);
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(customer => 
        customer.phoneNumber.includes(search) ||
        customer.name.toLowerCase().includes(searchLower) ||
        customer.customerId.toLowerCase().includes(searchLower) ||
        customer.accountNumber.toLowerCase().includes(searchLower) ||
        (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
        (customer.nationalId && customer.nationalId.includes(search))
      );
    }

    // Sort by creation date (newest first)
    customers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate totals
    const totalCustomers = customers.length;
    const totalLoanBalance = customers.reduce((sum, c) => sum + c.loanBalance, 0);
    const totalArrears = customers.reduce((sum, c) => sum + c.arrears, 0);

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedCustomers = customers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        customers: paginatedCustomers,
        summary: {
          totalCustomers,
          totalLoanBalance,
          totalArrears,
          activeCustomers: db.data.customers.filter(c => c.isActive).length
        },
        pagination: {
          total: totalCustomers,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCustomers / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customers'
    });
  }
};

/**
 * @desc    Get single customer by ID
 * @route   GET /api/customers/:id
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.getCustomer = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    // Find customer by id or customerId
    const customer = db.data.customers.find(
      customer => customer.id === req.params.id || 
                 customer.customerId === req.params.id
    );
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get customer's transactions
    const transactions = db.data.transactions
      .filter(transaction => transaction.customerId === customer.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        customer,
        recentTransactions: transactions,
        transactionCount: db.data.transactions.filter(t => t.customerId === customer.id).length
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer'
    });
  }
};

/**
 * @desc    Get customer by phone number
 * @route   GET /api/customers/phone/:phoneNumber
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.getCustomerByPhone = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const formattedPhone = formatPhoneNumber(req.params.phoneNumber);
    
    const customer = db.data.customers.find(
      customer => customer.phoneNumber === formattedPhone && customer.isActive
    );
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found. Please check the phone number or register the customer first.'
      });
    }

    // Get recent transactions
    const recentTransactions = db.data.transactions
      .filter(transaction => transaction.customerId === customer.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        customer,
        recentTransactions,
        transactionSummary: {
          totalTransactions: db.data.transactions.filter(t => t.customerId === customer.id).length,
          successfulTransactions: db.data.transactions.filter(t => 
            t.customerId === customer.id && t.status === 'SUCCESS'
          ).length,
          totalAmountPaid: db.data.transactions
            .filter(t => t.customerId === customer.id && t.status === 'SUCCESS')
            .reduce((sum, t) => sum + t.amount, 0)
        }
      }
    });
  } catch (error) {
    console.error('Get customer by phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer'
    });
  }
};

/**
 * @desc    Update customer information
 * @route   PUT /api/customers/:id
 * @access  Private (Admin, Supervisor)
 */
exports.updateCustomer = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const customerIndex = db.data.customers.findIndex(
      customer => customer.id === req.params.id
    );
    
    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update customer with new data
    const updatedCustomer = {
      ...db.data.customers[customerIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    // Format phone if provided
    if (req.body.phoneNumber) {
      updatedCustomer.phoneNumber = formatPhoneNumber(req.body.phoneNumber);
    }

    db.data.customers[customerIndex] = updatedCustomer;
    await db.write();

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        customer: updatedCustomer
      }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating customer'
    });
  }
};

/**
 * @desc    Soft delete customer (deactivate)
 * @route   DELETE /api/customers/:id
 * @access  Private (Admin only)
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const customerIndex = db.data.customers.findIndex(
      customer => customer.id === req.params.id
    );
    
    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Soft delete by setting isActive to false
    db.data.customers[customerIndex].isActive = false;
    db.data.customers[customerIndex].updatedAt = new Date().toISOString();
    
    await db.write();

    res.json({
      success: true,
      message: 'Customer deactivated successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting customer'
    });
  }
};

/**
 * @desc    Get customer dashboard statistics
 * @route   GET /api/customers/dashboard/stats
 * @access  Private (Admin, Supervisor)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const db = getDB();
    await db.read();
    
    const customers = db.data.customers.filter(c => c.isActive);
    const transactions = db.data.transactions;
    const successfulTransactions = transactions.filter(t => t.status === 'SUCCESS');
    
    // Calculate statistics
    const stats = {
      totalCustomers: customers.length,
      activeCustomers: customers.length,
      totalLoanPortfolio: customers.reduce((sum, c) => sum + c.loanBalance, 0),
      totalArrears: customers.reduce((sum, c) => sum + c.arrears, 0),
      totalRepayments: customers.reduce((sum, c) => sum + c.totalRepayments, 0),
      totalTransactions: transactions.length,
      successfulTransactions: successfulTransactions.length,
      totalAmountCollected: successfulTransactions.reduce((sum, t) => sum + t.amount, 0),
      recentCustomers: customers
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(c => ({
          name: c.name,
          phoneNumber: c.phoneNumber,
          loanBalance: c.loanBalance,
          arrears: c.arrears,
          createdAt: c.createdAt
        }))
    };

    // Calculate daily collection for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTransactions = successfulTransactions.filter(t => 
      new Date(t.createdAt) >= sevenDaysAgo
    );

    const dailyCollections = {};
    recentTransactions.forEach(t => {
      const date = new Date(t.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      dailyCollections[date] = (dailyCollections[date] || 0) + t.amount;
    });

    res.json({
      success: true,
      data: {
        stats,
        dailyCollections
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard statistics'
    });
  }
};