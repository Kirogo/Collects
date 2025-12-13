// Utility function for generating transaction IDs
// for a banking application payment processing system.
// Combines timestamp and random components for uniqueness.


const generateTransactionId = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN${timestamp.slice(-8)}${random}`;
};

module.exports = {
  generateTransactionId
};