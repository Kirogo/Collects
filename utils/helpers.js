/**
 * Helper function to format phone number to Kenyan format
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  let cleaned = phone.toString().replace(/\D/g, '');
  
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  } else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1);
    if (cleaned.length === 12) return cleaned;
  } else if (cleaned.length === 9) {
    return '254' + cleaned;
  }
  
  return phone; // Return original if can't format
};

/**
 * Generate account number for customers
 */
const generateAccountNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LOAN${timestamp}${random}`;
};

/**
 * Generate internal IDs for MongoDB
 */
const generateInternalId = (prefix, counter) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

/**
 * Validate Kenyan phone number
 */
const isValidKenyanPhone = (phone) => {
  const formatted = formatPhoneNumber(phone);
  const kenyanRegex = /^254(7|1)\d{8}$/;
  return kenyanRegex.test(formatted);
};

/**
 * Calculate new loan balance and arrears
 */
const calculateNewBalances = (customer, paymentAmount) => {
  const loanBalanceBefore = customer.loanBalance;
  const arrearsBefore = customer.arrears;
  
  let newLoanBalance = loanBalanceBefore;
  let newArrears = arrearsBefore;
  
  // First apply to arrears if any
  if (arrearsBefore > 0) {
    if (paymentAmount >= arrearsBefore) {
      paymentAmount -= arrearsBefore;
      newArrears = 0;
    } else {
      newArrears -= paymentAmount;
      paymentAmount = 0;
    }
  }
  
  // Then apply to loan balance
  if (paymentAmount > 0) {
    newLoanBalance = Math.max(0, loanBalanceBefore - paymentAmount);
  }
  
  return { newLoanBalance, newArrears };
};

module.exports = {
  formatPhoneNumber,
  generateAccountNumber,
  generateInternalId,
  isValidKenyanPhone,
  calculateNewBalances
};