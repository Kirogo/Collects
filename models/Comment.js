// models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['follow_up', 'payment_promise', 'complaint', 'general'],
    default: 'follow_up'
  },
  author: {
    type: String,
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerName: {
    type: String
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
commentSchema.index({ customerId: 1, createdAt: -1 });
commentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);