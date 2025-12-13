// Database configuration and initialization using lowdb
// with default data and sample entries.
// It ensures the database file exists, initializes it with
// default users and customers if empty, and provides helper
// functions for database access and ID generation.


const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, '../db.json');

// Default data structure
const defaultData = {
  users: [],
  customers: [],
  transactions: [],
  settings: {
    lastCustomerId: 1000,
    lastTransactionId: 1000,
    lastUserId: 1000,
    lastCustomerInternalId: 1000
  }
};

// Ensure db.json exists
if (!fs.existsSync(dbPath)) {
  console.log('📁 Creating database file: db.json');
  fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
}

// Read existing data
let existingData;
try {
  const fileContent = fs.readFileSync(dbPath, 'utf-8');
  existingData = JSON.parse(fileContent);
} catch (error) {
  console.log('⚠️  Database file corrupted, using default data');
  existingData = defaultData;
}

// Merge with default data
const initialData = {
  ...defaultData,
  ...existingData,
  users: existingData.users || defaultData.users,
  customers: existingData.customers || defaultData.customers,
  transactions: existingData.transactions || defaultData.transactions,
  settings: {
    ...defaultData.settings,
    ...(existingData.settings || {})
  }
};

// Initialize lowdb
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, initialData);

// Initialize database with default data
const initializeDB = async () => {
  try {
    // Read data
    await db.read();
    
    // Ensure data structure
    db.data ||= initialData;
    db.data.users ||= [];
    db.data.customers ||= [];
    db.data.transactions ||= [];
    db.data.settings ||= defaultData.settings;

    // Create admin user if no users exist
    if (db.data.users.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@2024', salt);
      
      const defaultUsers = [
        {
          id: 'USR1001',
          username: 'admin',
          email: 'admin@ncbabank.co.ke',
          password: hashedPassword,
          fullName: 'System Administrator',
          employeeId: 'EMP001',
          role: 'ADMIN',
          department: 'IT',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 'USR1002',
          username: 'supervisor',
          email: 'supervisor@ncbabank.co.ke',
          password: await bcrypt.hash('Super@2024', salt),
          fullName: 'Collections Supervisor',
          employeeId: 'EMP002',
          role: 'SUPERVISOR',
          department: 'Collections',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 'USR1003',
          username: 'agent1',
          email: 'agent1@ncbabank.co.ke',
          password: await bcrypt.hash('Agent@2024', salt),
          fullName: 'John Mwangi',
          employeeId: 'EMP003',
          role: 'AGENT',
          department: 'Collections',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: null
        }
      ];
      
      db.data.users.push(...defaultUsers);
      console.log('👥 Created 3 default staff accounts');
    }
    
    // Add sample loan customers
    if (db.data.customers.length === 0) {
      const sampleCustomers = [
        {
          id: 'CUS1001',
          phoneNumber: '254712345678',
          name: 'John Kamau',
          customerId: 'CUST001',
          accountNumber: 'LOAN001234',
          loanBalance: 150000,
          arrears: 25000,
          totalRepayments: 50000,
          lastPaymentDate: '2024-01-05T10:30:00.000Z',
          isActive: true,
          createdAt: '2024-01-01T09:00:00.000Z',
          updatedAt: '2024-01-10T14:20:00.000Z',
          createdBy: 'admin'
        },
        {
          id: 'CUS1002',
          phoneNumber: '254723456789',
          name: 'Mary Wanjiku',
          customerId: 'CUST002',
          accountNumber: 'LOAN001235',
          loanBalance: 75000,
          arrears: 15000,
          totalRepayments: 25000,
          lastPaymentDate: '2024-01-08T11:15:00.000Z',
          isActive: true,
          createdAt: '2024-01-02T10:00:00.000Z',
          updatedAt: '2024-01-10T15:30:00.000Z',
          createdBy: 'admin'
        },
        {
          id: 'CUS1003',
          phoneNumber: '254734567890',
          name: 'Peter Ochieng',
          customerId: 'CUST003',
          accountNumber: 'LOAN001236',
          loanBalance: 250000,
          arrears: 50000,
          totalRepayments: 100000,
          lastPaymentDate: '2024-01-03T14:45:00.000Z',
          isActive: true,
          createdAt: '2024-01-03T11:00:00.000Z',
          updatedAt: '2024-01-10T16:45:00.000Z',
          createdBy: 'admin'
        }
      ];
      
      db.data.customers.push(...sampleCustomers);
      console.log('👥 Added 3 sample loan customers');
    }
    
    await db.write();
    console.log('✅ Database initialized successfully');
    
    return db;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// Connect to database
const connectDB = async () => {
  try {
    console.log('🔗 Connecting to database...');
    await initializeDB();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Helper function to generate IDs
const generateId = async (prefix, counter) => {
  await db.read();
  const newId = db.data.settings[counter] + 1;
  db.data.settings[counter] = newId;
  await db.write();
  return `${prefix}${newId}`;
};

// Export
module.exports = {
  connectDB,
  getDB: () => {
    if (!db) {
      throw new Error('Database not initialized. Call connectDB() first.');
    }
    return db;
  },
  generateId
};