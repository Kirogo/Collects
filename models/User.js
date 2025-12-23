const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    index: true  // Keep this
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    index: true  // Keep this
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'supervisor', 'agent'],
    default: 'agent',
    index: true  // Keep this
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true  // Keep this
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

// REMOVE ALL schema.index() calls below if you're using index: true above
// UserSchema.index({ username: 1 });  // DELETE THIS LINE
// UserSchema.index({ email: 1 });     // DELETE THIS LINE
// UserSchema.index({ role: 1 });      // DELETE THIS LINE
// UserSchema.index({ isActive: 1 });  // DELETE THIS LINE

module.exports = mongoose.model('User', UserSchema);