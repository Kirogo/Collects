/**
 * MPesa STK Push Simulator
 * In production, replace with actual Safaricom API calls
 */

const { 
  generateMpesaReceiptNumber, 
  generateCheckoutRequestId 
} = require('./generateIds');

class MpesaSimulator {
  constructor() {
    this.pendingTransactions = new Map();
    this.callbacks = [];
    
    // Simulate some common MPesa responses
    this.responses = {
      success: {
        ResponseCode: '0',
        ResponseDescription: 'Success. Request accepted for processing',
        CustomerMessage: 'Success. Request accepted for processing'
      },
      invalid_pin: {
        ResponseCode: '1',
        ResponseDescription: 'The initiator information is invalid.',
        CustomerMessage: 'Invalid MPesa PIN'
      },
      insufficient_funds: {
        ResponseCode: '1',
        ResponseDescription: 'The initiator information is invalid.',
        CustomerMessage: 'Insufficient funds in MPesa account'
      },
      user_cancelled: {
        ResponseCode: '1032',
        ResponseDescription: 'Request cancelled by user',
        CustomerMessage: 'MPesa PIN entry cancelled'
      }
    };
  }

  /**
   * Simulate initiating STK Push
   */
  async initiateSTKPush(phoneNumber, amount, transactionId, description) {
    console.log(`[MPESA SIM] 📱 Initiating STK Push to ${phoneNumber} for Ksh ${amount}`);
    
    // Simulate API delay
    await this.sleep(1500);
    
    // Simulate network failure 5% of the time
    if (Math.random() < 0.05) {
      throw new Error('Network error: Could not reach MPesa gateway');
    }

    // Format phone if needed
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    // Generate simulated request data
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const checkoutRequestID = generateCheckoutRequestId();

    const requestData = {
      BusinessShortCode: '174379',
      Password: this.generatePassword(timestamp),
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: '123456', // Till number or Paybill
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: transactionId,
      TransactionDesc: description,
      CheckoutRequestID: checkoutRequestID
    };

    // Store transaction
    this.pendingTransactions.set(transactionId, {
      ...requestData,
      id: transactionId,
      status: 'PENDING',
      phoneNumber: formattedPhone,
      amount: amount,
      description: description,
      createdAt: new Date(),
      lastUpdated: new Date()
    });

    console.log(`[MPESA SIM] ✅ STK Push sent to ${formattedPhone}`);
    console.log(`[MPESA SIM] 📋 CheckoutRequestID: ${checkoutRequestID}`);
    
    return {
      success: true,
      message: 'STK Push initiated successfully',
      transactionId,
      checkoutRequestID,
      customerMessage: 'Enter your MPesa PIN to complete the payment',
      merchantRequestID: `MER-${Date.now()}`,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing',
      requestData
    };
  }

  /**
   * Simulate processing payment with PIN
   */
  async processPayment(transactionId, pin) {
    console.log(`[MPESA SIM] 🔄 Processing payment for ${transactionId}`);
    
    const transaction = this.pendingTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found or expired`);
    }

    // Update status
    transaction.status = 'PROCESSING';
    transaction.lastUpdated = new Date();
    
    await this.sleep(2000); // Simulate processing time

    // Validate PIN
    const isValid = this.validatePin(pin);
    const hasFunds = this.checkFunds(transaction.phoneNumber, transaction.amount);

    if (isValid && hasFunds) {
      // Successful payment
      transaction.status = 'SUCCESS';
      transaction.mpesaReceiptNumber = this.generateMpesaReceiptNumber();
      transaction.completedAt = new Date();
      
      console.log(`[MPESA SIM] ✅ Payment successful for ${transactionId}`);
      console.log(`[MPESA SIM] 📝 Receipt: ${transaction.mpesaReceiptNumber}`);

      // Simulate callback to bank system
      await this.sendCallback(transaction);
      
      return {
        success: true,
        transactionId,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        amount: transaction.amount,
        phoneNumber: transaction.phoneNumber,
        transactionDate: transaction.completedAt.toISOString(),
        message: 'Payment completed successfully',
        response: this.responses.success
      };
    } else if (!isValid) {
      // Invalid PIN
      transaction.status = 'FAILED';
      transaction.failureReason = 'Invalid MPesa PIN';
      
      console.log(`[MPESA SIM] ❌ Payment failed - Invalid PIN for ${transactionId}`);
      
      return {
        success: false,
        transactionId,
        message: 'Invalid MPesa PIN. Please try again.',
        response: this.responses.invalid_pin
      };
    } else {
      // Insufficient funds
      transaction.status = 'FAILED';
      transaction.failureReason = 'Insufficient funds';
      
      console.log(`[MPESA SIM] ❌ Payment failed - Insufficient funds for ${transactionId}`);
      
      return {
        success: false,
        transactionId,
        message: 'Insufficient funds in MPesa account',
        response: this.responses.insufficient_funds
      };
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId) {
    return this.pendingTransactions.get(transactionId) || null;
  }

  /**
   * Get all pending transactions
   */
  getPendingTransactions() {
    return Array.from(this.pendingTransactions.values())
      .filter(t => t.status === 'PENDING');
  }

  /**
   * Simulate callback to bank system
   */
  async sendCallback(transaction) {
    const callbackData = {
      Body: {
        stkCallback: {
          MerchantRequestID: `MER-${Date.now()}`,
          CheckoutRequestID: transaction.CheckoutRequestID,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: transaction.amount },
              { Name: 'MpesaReceiptNumber', Value: transaction.mpesaReceiptNumber },
              { Name: 'TransactionDate', Value: Date.now().toString() },
              { Name: 'PhoneNumber', Value: transaction.phoneNumber }
            ]
          }
        }
      }
    };

    this.callbacks.push({
      transactionId: transaction.id,
      data: callbackData,
      sentAt: new Date()
    });

    console.log(`[MPESA SIM] 📤 Callback sent for ${transaction.id}`);
    
    return callbackData;
  }

  /**
   * Validate PIN (simplified for demo)
   */
  validatePin(pin) {
    // Demo validation - accepts '1234' or any 4-digit PIN
    return /^\d{4}$/.test(pin);
  }

  /**
   * Check if user has sufficient funds (simulated)
   */
  checkFunds(phoneNumber, amount) {
    // Simulate checking funds - 90% success rate
    return Math.random() < 0.9;
  }

  /**
   * Format phone number to 254 format
   */
  formatPhoneNumber(phone) {
    if (phone.startsWith('0')) {
      return '254' + phone.substring(1);
    } else if (phone.startsWith('254')) {
      return phone;
    } else if (phone.startsWith('+254')) {
      return phone.substring(1);
    } else {
      return '254' + phone;
    }
  }

  /**
   * Generate MPesa API password
   */
  generatePassword(timestamp) {
    const businessShortCode = '174379';
    const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    return Buffer.from(businessShortCode + passkey + timestamp).toString('base64');
  }

  /**
   * Generate MPesa receipt number
   */
  generateMpesaReceiptNumber() {
    const date = new Date();
    const dateStr = date.getFullYear().toString().slice(-2) + 
                   (date.getMonth() + 1).toString().padStart(2, '0') +
                   date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `MC${dateStr}${random}`;
  }

  /**
   * Sleep/delay function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new MpesaSimulator();