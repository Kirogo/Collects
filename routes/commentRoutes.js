// routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

// @desc    Get comments for a customer
// @route   GET /api/customers/:customerId/comments
// @access  Private
router.get('/customers/:customerId/comments', protect, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    console.log('🔍 Fetching comments for customer:', customerId);
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid customer ID format' 
      });
    }

    const comments = await Comment.find({ customerId })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${comments.length} comments for customer ${customerId}`);

    res.json({
      success: true,
      data: {
        comments,
        count: comments.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching comments',
      error: error.message
    });
  }
});

// @desc    Add a comment to a customer
// @route   POST /api/customers/:customerId/comments
// @access  Private
router.post('/customers/:customerId/comments', protect, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { comment, type = 'follow_up', customerName } = req.body;
    const user = req.user;

    console.log('💾 Adding comment for customer:', customerId);
    console.log('📝 Comment data:', { comment, type, customerName });
    console.log('👤 User:', user.name || user.username);

    // Validate input
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Comment text is required' 
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid customer ID format' 
      });
    }

    const newComment = new Comment({
      customerId,
      comment: comment.trim(),
      type,
      author: user.name || user.username || 'Agent',
      authorId: user._id,
      customerName: customerName || ''
    });

    await newComment.save();

    console.log('✅ Comment saved successfully:', newComment._id);

    res.json({
      success: true,
      data: {
        comment: newComment,
        message: 'Comment added successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while adding comment',
      error: error.message
    });
  }
});

module.exports = router;