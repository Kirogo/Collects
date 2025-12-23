// controllers/customerController.js - CORRECTED VERSION
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { 
  formatPhoneNumber, 
  generateAccountNumber, 
  generateInternalId,
  isValidKenyanPhone 
} = require('../utils/helpers');

/**
 * @desc    Get single customer by ID
 * @route   GET /api/customers/:id
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 [getCustomer] Request received for ID: "${id}"`);
    
    // Check if ID is undefined or invalid
    if (!id || id === 'undefined' || id === 'null') {
      console.log('❌ Invalid ID provided');
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
    }
    
    let customer = null;
    
    // Method 1: Try by MongoDB ObjectId if it's valid
    if (mongoose.Types.ObjectId.isValid(id)) {
      console.log(`🔍 [getCustomer] Searching by ObjectId: ${id}`);
      try {
        customer = await Customer.findById(id).select('-__v');
        console.log(`✅ [getCustomer] ObjectId search: ${customer ? 'FOUND' : 'NOT FOUND'}`);
      } catch (mongooseError) {
        console.error(`❌ [getCustomer] ObjectId search error:`, mongooseError.message);
      }
    }
    
    // Method 2: If not found by ObjectId, try by customerId
    if (!customer) {
      console.log(`🔍 [getCustomer] Searching by customerId: ${id}`);
      customer = await Customer.findOne({ customerId: id }).select('-__v');
      console.log(`✅ [getCustomer] customerId search: ${customer ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Method 3: If still not found, try by customerInternalId
    if (!customer) {
      console.log(`🔍 [getCustomer] Searching by customerInternalId: ${id}`);
      customer = await Customer.findOne({ customerInternalId: id }).select('-__v');
      console.log(`✅ [getCustomer] customerInternalId search: ${customer ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Method 4: Try by phone number
    if (!customer) {
      console.log(`🔍 [getCustomer] Searching by phoneNumber: ${id}`);
      const formattedPhone = formatPhoneNumber(id);
      customer = await Customer.findOne({ phoneNumber: formattedPhone }).select('-__v');
      console.log(`✅ [getCustomer] phoneNumber search: ${customer ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    if (!customer) {
      console.log(`❌ [getCustomer] Customer not found with any search method for ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    console.log(`🎉 [getCustomer] SUCCESS: Found customer "${customer.name}" with _id: ${customer._id}`);

    // Get customer's recent transactions
    console.log(`🔍 [getCustomer] Fetching transactions for customer: ${customer._id}`);
    const [recentTransactions, transactionCount] = await Promise.all([
      Transaction.find({ customerId: customer._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('-__v'),
      Transaction.countDocuments({ customerId: customer._id })
    ]);

    console.log(`✅ [getCustomer] Found ${recentTransactions.length} recent transactions, total: ${transactionCount}`);

    // Build response
    const response = {
      success: true,
      message: 'Customer details retrieved successfully',
      data: {
        customer,
        recentTransactions,
        transactionCount
      }
    };
    
    console.log(`📤 [getCustomer] Sending response for customer: ${customer.name}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ [getCustomer] CRITICAL ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      console.error('❌ CastError: Invalid ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format'
      });
    }
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      console.error('❌ ValidationError:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    
    // Generic server error
    console.error('❌ Unhandled error in getCustomer');
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const { 
      search = '', 
      page = 1, 
      limit = 20,
      status = 'active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build query
    const query = {};
    
    // Filter by status
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    // Search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { phoneNumber: { $regex: searchRegex } },
        { name: { $regex: searchRegex } },
        { customerId: { $regex: searchRegex } },
        { accountNumber: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { nationalId: { $regex: searchRegex } }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute queries in parallel
    const [customers, totalCustomers, stats] = await Promise.all([
      Customer.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-__v'),
      Customer.countDocuments(query),
      Customer.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalLoanBalance: { $sum: '$loanBalance' },
            totalArrears: { $sum: '$arrears' },
            totalRepayments: { $sum: '$totalRepayments' }
          }
        }
      ])
    ]);
    
    const summary = stats[0] || {
      totalLoanBalance: 0,
      totalArrears: 0,
      totalRepayments: 0
    };
    
    res.json({
      success: true,
      message: 'Customers retrieved successfully',
      data: {
        customers,
        summary: {
          totalCustomers,
          ...summary,
          activeCustomers: await Customer.countDocuments({ isActive: true })
        },
        pagination: {
          total: totalCustomers,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCustomers / limitNum)
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
 * @desc    Create new loan customer
 * @route   POST /api/customers
 * @access  Private (Admin, Supervisor, Agent)
 */
exports.createCustomer = async (req, res) => {
  const session = await Customer.startSession();
  session.startTransaction();
  
  try {
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
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and name'
      });
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!isValidKenyanPhone(formattedPhone)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Kenyan phone number (e.g., 0712345678 or 254712345678)'
      });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      phoneNumber: formattedPhone,
      isActive: true
    }).session(session);
    
    if (existingCustomer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    // Generate IDs
    const customerInternalId = generateInternalId('CUS');
    const finalCustomerId = customerId || `CUST${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const finalAccountNumber = accountNumber || generateAccountNumber();

    // Create customer object
    const newCustomer = await Customer.create([{
      customerInternalId,
      customerId: finalCustomerId,
      phoneNumber: formattedPhone,
      name,
      accountNumber: finalAccountNumber,
      loanBalance: parseFloat(loanBalance) || 0,
      arrears: parseFloat(arrears) || 0,
      email,
      nationalId,
      totalRepayments: 0,
      lastPaymentDate: null,
      isActive: true,
      createdBy: req.user.username,
      createdByUserId: req.user.id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        customer: newCustomer[0]
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Create customer error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Customer with this ${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error creating customer'
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
    const formattedPhone = formatPhoneNumber(req.params.phoneNumber);
    
    const customer = await Customer.findOne({
      phoneNumber: formattedPhone,
      isActive: true
    }).select('-__v');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found. Please check the phone number or register the customer first.'
      });
    }

    // Get recent transactions and transaction summary in parallel
    const [recentTransactions, transactionSummary] = await Promise.all([
      Transaction.find({ customerId: customer._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('-__v'),
      Transaction.aggregate([
        { $match: { customerId: customer._id } },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            successfulTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            },
            totalAmountPaid: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] }
            }
          }
        }
      ])
    ]);

    const summary = transactionSummary[0] || {
      totalTransactions: 0,
      successfulTransactions: 0,
      totalAmountPaid: 0
    };

    res.json({
      success: true,
      message: 'Customer retrieved successfully',
      data: {
        customer,
        recentTransactions,
        transactionSummary: summary
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
    const { id } = req.params;
    
    // Find customer
    const customer = await Customer.findOne({
      $or: [
        { _id: id },
        { customerId: id },
        { customerInternalId: id }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check permissions
    if (req.user.role === 'agent' && customer.createdByUserId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update customers you created'
      });
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Format phone if provided
    if (req.body.phoneNumber) {
      updateData.phoneNumber = formatPhoneNumber(req.body.phoneNumber);
      
      // Check for duplicate phone number
      if (updateData.phoneNumber !== customer.phoneNumber) {
        const existingCustomer = await Customer.findOne({
          phoneNumber: updateData.phoneNumber,
          isActive: true,
          _id: { $ne: customer._id }
        });
        
        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: 'Another customer with this phone number already exists'
          });
        }
      }
    }

    // Update customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        customer: updatedCustomer
      }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Another customer with this ${field} already exists`
      });
    }
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
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
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can deactivate customers'
      });
    }
    
    const { id } = req.params;
    
    const customer = await Customer.findOne({
      $or: [
        { _id: id },
        { customerId: id },
        { customerInternalId: id }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has outstanding balance
    if (customer.loanBalance > 0 || customer.arrears > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate customer with outstanding balance or arrears'
      });
    }

    // Soft delete by setting isActive to false
    customer.isActive = false;
    customer.updatedAt = new Date();
    await customer.save();

    res.json({
      success: true,
      message: 'Customer deactivated successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
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
    // Get stats in parallel for better performance
    const [
      customerStats,
      transactionStats,
      recentCustomers,
      dailyCollections
    ] = await Promise.all([
      // Customer statistics
      Customer.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            totalLoanPortfolio: { $sum: '$loanBalance' },
            totalArrears: { $sum: '$arrears' },
            totalRepayments: { $sum: '$totalRepayments' }
          }
        }
      ]),
      // Transaction statistics
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            successfulTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            },
            totalAmountCollected: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] }
            }
          }
        }
      ]),
      // Recent customers
      Customer.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name phoneNumber loanBalance arrears createdAt'),
      // Daily collections for last 7 days
      Transaction.aggregate([
        {
          $match: {
            status: 'SUCCESS',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            dayOfWeek: { $first: { $dayOfWeek: '$createdAt' } },
            totalAmount: { $sum: '$amount' },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    const stats = {
      ...(customerStats[0] || {
        totalCustomers: 0,
        totalLoanPortfolio: 0,
        totalArrears: 0,
        totalRepayments: 0
      }),
      ...(transactionStats[0] || {
        totalTransactions: 0,
        successfulTransactions: 0,
        totalAmountCollected: 0
      }),
      recentCustomers: recentCustomers.map(c => ({
        name: c.name,
        phoneNumber: c.phoneNumber,
        loanBalance: c.loanBalance,
        arrears: c.arrears,
        createdAt: c.createdAt
      }))
    };

    // Format daily collections
    const formattedDailyCollections = {};
    dailyCollections.forEach(item => {
      const date = new Date(item._id);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      formattedDailyCollections[dayName] = item.totalAmount;
    });

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        stats,
        dailyCollections: formattedDailyCollections
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