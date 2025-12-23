require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const { formatPhoneNumber } = require('../utils/helpers');

// Helper function to generate IDs
function generateInternalId(prefix) {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

async function migrateData() {
  try {
    console.log('🚀 Starting MongoDB Migration...');
    
    // Check environment variable
    if (!process.env.MONGODB_URI) {
      console.error('❌ ERROR: MONGODB_URI is not defined in .env file');
      console.log('📝 Please add this to your .env file:');
      console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/collectsDB');
      console.log('\n💡 Quick fix: Create a .env file in your backend directory with:');
      console.log('MONGODB_URI="your-actual-mongodb-uri-here"');
      console.log('JWT_SECRET="your-jwt-secret"');
      process.exit(1);
    }
    
    console.log('✅ MONGODB_URI loaded successfully');
    
    // Connect to MongoDB (NEW SYNTAX - remove old options)
    console.log('🔗 Connecting to MongoDB...');
    
    // Remove the options object - newer MongoDB driver doesn't need them
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

    // Read existing data
    const dbPath = path.join(__dirname, '..', 'db.json');
    console.log(`🔍 Looking for db.json at: ${dbPath}`);
    
    if (!fs.existsSync(dbPath)) {
      console.log('⚠️  db.json not found. Creating sample data instead...');
      await createSampleData();
      mongoose.connection.close();
      return;
    }
    
    const existingData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log(`📊 Found data in db.json:`);
    console.log(`   Users: ${existingData.users?.length || 0}`);
    console.log(`   Customers: ${existingData.customers?.length || 0}`);
    console.log(`   Transactions: ${existingData.transactions?.length || 0}`);

    // Clear existing MongoDB collections
    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Transaction.deleteMany({})
    ]);
    console.log('✅ Collections cleared');

    // Migrate users
    if (existingData.users && existingData.users.length > 0) {
      console.log(`👥 Migrating ${existingData.users.length} users...`);
      const usersToInsert = [];
      
      for (const user of existingData.users) {
        let hashedPassword = user.password;
        
        // Hash passwords if they're not already hashed
        if (user.password && !user.password.startsWith('$2')) {
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(user.password, salt);
          console.log(`   🔐 Hashed password for user: ${user.username}`);
        }
        
        usersToInsert.push({
          username: user.username,
          email: user.email || `${user.username}@example.com`,
          password: hashedPassword,
          role: user.role || 'agent',
          isActive: user.isActive !== false,
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          createdBy: user.createdBy || 'system',
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
        });
      }
      
      if (usersToInsert.length > 0) {
        const insertedUsers = await User.insertMany(usersToInsert);
        console.log(`✅ Migrated ${insertedUsers.length} users`);
      }
    } else {
      console.log('⚠️  No users found in db.json');
    }

    // Migrate customers
    if (existingData.customers && existingData.customers.length > 0) {
      console.log(`👤 Migrating ${existingData.customers.length} customers...`);
      const customersToInsert = [];
      
      for (const customer of existingData.customers) {
        const formattedPhone = formatPhoneNumber(customer.phoneNumber || '');
        const customerInternalId = generateInternalId('CUS');
        
        customersToInsert.push({
          customerInternalId,
          customerId: customer.customerId || `CUST${Date.now().toString().slice(-6)}`,
          phoneNumber: formattedPhone,
          name: customer.name || 'Unknown Customer',
          accountNumber: customer.accountNumber || `LOAN${Math.floor(1000000 + Math.random() * 9000000)}`,
          loanBalance: parseFloat(customer.loanBalance) || 0,
          arrears: parseFloat(customer.arrears) || 0,
          totalRepayments: parseFloat(customer.totalRepayments) || 0,
          email: customer.email || '',
          nationalId: customer.nationalId || '',
          lastPaymentDate: customer.lastPaymentDate ? new Date(customer.lastPaymentDate) : null,
          isActive: customer.isActive !== false,
          createdBy: customer.createdBy || 'system',
          createdAt: customer.createdAt ? new Date(customer.createdAt) : new Date(),
          updatedAt: customer.updatedAt ? new Date(customer.updatedAt) : new Date()
        });
      }
      
      if (customersToInsert.length > 0) {
        const insertedCustomers = await Customer.insertMany(customersToInsert);
        console.log(`✅ Migrated ${insertedCustomers.length} customers`);
      }
    } else {
      console.log('⚠️  No customers found in db.json');
    }

    // Migrate transactions (only if we have customers)
    if (existingData.transactions && existingData.transactions.length > 0) {
      console.log(`💳 Migrating ${existingData.transactions.length} transactions...`);
      
      // Get all customers for mapping
      const allCustomers = await Customer.find({});
      const customerMap = new Map();
      allCustomers.forEach(c => {
        if (c.customerInternalId) customerMap.set(c.customerInternalId, c._id);
        if (c.customerId) customerMap.set(c.customerId, c._id);
      });

      const transactionsToInsert = [];
      let skippedTransactions = 0;
      
      for (const transaction of existingData.transactions) {
        // Find customer for this transaction
        let customerId = null;
        if (transaction.customerId) {
          customerId = customerMap.get(transaction.customerId);
        }
        
        // If customer not found, skip this transaction
        if (!customerId) {
          skippedTransactions++;
          continue;
        }
        
        const transactionInternalId = generateInternalId('TRN');
        
        transactionsToInsert.push({
          transactionInternalId,
          transactionId: transaction.transactionId || `TXN${Date.now().toString().slice(-8)}`,
          customerId: customerId,
          customerInternalId: transaction.customerId,
          phoneNumber: transaction.phoneNumber ? formatPhoneNumber(transaction.phoneNumber) : '',
          amount: parseFloat(transaction.amount) || 0,
          description: transaction.description || 'Loan Repayment',
          status: transaction.status || 'PENDING',
          loanBalanceBefore: parseFloat(transaction.loanBalanceBefore) || 0,
          loanBalanceAfter: parseFloat(transaction.loanBalanceAfter) || 0,
          arrearsBefore: parseFloat(transaction.arrearsBefore) || 0,
          arrearsAfter: parseFloat(transaction.arrearsAfter) || 0,
          paymentMethod: transaction.paymentMethod || 'MPESA',
          initiatedBy: transaction.initiatedBy || 'system',
          mpesaReceiptNumber: transaction.mpesaReceiptNumber || '',
          stkPushResponse: transaction.stkPushResponse || {},
          callbackData: transaction.callbackData || {},
          createdAt: transaction.createdAt ? new Date(transaction.createdAt) : new Date(),
          updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt) : new Date()
        });
      }
      
      if (transactionsToInsert.length > 0) {
        const insertedTransactions = await Transaction.insertMany(transactionsToInsert);
        console.log(`✅ Migrated ${insertedTransactions.length} transactions`);
        if (skippedTransactions > 0) {
          console.log(`⚠️  Skipped ${skippedTransactions} transactions (customer not found)`);
        }
      }
    } else {
      console.log('⚠️  No transactions found in db.json');
    }

    // Create admin user if no users were migrated
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('👑 Creating default admin user...');
      await createAdminUser();
    }

    // Create sample data if no customers
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      console.log('📝 Creating sample customer data...');
      await createSampleCustomer();
    }

    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`📊 FINAL COUNTS:`);
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Customers: ${await Customer.countDocuments()}`);
    console.log(`   Transactions: ${await Transaction.countDocuments()}`);
    console.log('\n🚀 Your MongoDB migration is complete!');
    console.log('💡 Next steps:');
    console.log('   1. Test your API endpoints');
    console.log('   2. Update your frontend if needed');
    console.log('   3. Remove db.json file (backup first)');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    
  } catch (error) {
    console.error('❌ MIGRATION FAILED:', error.message);
    console.error('🔧 Error details:', error);
    
    if (error.name === 'MongoServerError') {
      console.log('💡 Check your MongoDB Atlas connection:');
      console.log('   - Is your IP whitelisted?');
      console.log('   - Are credentials correct?');
    }
    
    process.exit(1);
  }
}

async function createAdminUser() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await User.create({
      username: 'admin',
      email: 'admin@loanapp.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdBy: 'system'
    });
    
    console.log('✅ Created admin user:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@loanapp.com');
    console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
}

async function createSampleCustomer() {
  try {
    // Get admin user
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('⚠️  Admin user not found, creating sample data without reference');
      return;
    }
    
    // Create sample customer
    const sampleCustomer = await Customer.create({
      customerInternalId: generateInternalId('CUS'),
      customerId: 'CUST001',
      phoneNumber: '254712345678',
      name: 'John Doe',
      accountNumber: 'LOAN1234567',
      loanBalance: 50000,
      arrears: 10000,
      totalRepayments: 15000,
      email: 'john.doe@example.com',
      nationalId: '12345678',
      isActive: true,
      createdBy: adminUser.username,
      createdByUserId: adminUser._id
    });
    
    console.log('✅ Created sample customer:');
    console.log(`   Name: ${sampleCustomer.name}`);
    console.log(`   Phone: ${sampleCustomer.phoneNumber}`);
    console.log(`   Loan Balance: Ksh ${sampleCustomer.loanBalance}`);
    
  } catch (error) {
    console.error('Error creating sample customer:', error.message);
  }
}

// Run migration
migrateData();