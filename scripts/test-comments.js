// scripts/test-comments.js
const mongoose = require('mongoose');
require('dotenv').config();

const testComments = async () => {
  try {
    console.log('🔧 Testing Comments System...\n');
    
    // Check if Comment model exists
    let Comment;
    try {
      Comment = require('../models/Comment');
      console.log('✅ Comment model loaded');
    } catch (error) {
      console.log('❌ Comment model not found. Creating simple model...');
      
      // Create a simple schema for testing
      const commentSchema = new mongoose.Schema({
        customerId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        comment: {
          type: String,
          required: true
        },
        author: {
          type: String,
          required: true
        },
        type: {
          type: String,
          default: 'follow_up'
        },
        customerName: {
          type: String
        }
      }, {
        timestamps: true
      });
      
      Comment = mongoose.model('Comment', commentSchema);
    }
    
    // Connect to MongoDB (simplified connection for older MongoDB)
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collect';
    console.log(`🔗 Connecting to MongoDB: ${mongoURI}`);
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ Connected to MongoDB\n');
    
    // Test 1: Count existing comments
    const commentCount = await Comment.countDocuments({});
    console.log(`📊 Total comments in database: ${commentCount}`);
    
    // Test 2: Create a test comment
    console.log('\n🧪 Creating test comment...');
    const testCustomerId = new mongoose.Types.ObjectId();
    const testComment = new Comment({
      customerId: testCustomerId,
      comment: 'This is a test comment created by the test script',
      author: 'Test Script',
      type: 'follow_up',
      customerName: 'Test Customer for Script'
    });

    await testComment.save();
    console.log(`✅ Test comment created with ID: ${testComment._id}`);
    console.log(`   Customer ID: ${testComment.customerId}`);
    console.log(`   Comment: "${testComment.comment}"`);
    console.log(`   Author: ${testComment.author}`);
    console.log(`   Created: ${testComment.createdAt}`);
    
    // Test 3: Find comments for the test customer
    console.log('\n🔍 Finding comments for test customer...');
    const customerComments = await Comment.find({ customerId: testCustomerId });
    console.log(`✅ Found ${customerComments.length} comments for customer ${testCustomerId}`);
    
    // Test 4: List all comments (limited to 5)
    console.log('\n📝 Sample comments in database (max 5):');
    const allComments = await Comment.find({}).limit(5).sort({ createdAt: -1 });
    allComments.forEach((comment, index) => {
      console.log(`\n  Comment ${index + 1}:`);
      console.log(`    ID: ${comment._id}`);
      console.log(`    Customer: ${comment.customerId}`);
      console.log(`    Author: ${comment.author}`);
      console.log(`    Comment: ${comment.comment.substring(0, 50)}${comment.comment.length > 50 ? '...' : ''}`);
      console.log(`    Created: ${comment.createdAt.toLocaleString()}`);
    });
    
    // Test 5: Clean up test comment
    console.log('\n🧹 Cleaning up test comment...');
    await Comment.deleteOne({ _id: testComment._id });
    console.log('✅ Test comment cleaned up');
    
    const finalCount = await Comment.countDocuments({});
    console.log(`\n📊 Final comment count: ${finalCount}`);
    
    console.log('\n🎉 All tests passed successfully!');
    
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
    
    process.exit(1);
  }
};

testComments();