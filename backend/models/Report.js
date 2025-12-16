const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    enum: ['comment', 'message', 'post'],
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedBy: {
    type: String,
    default: 'AI System'
  },
  contentType: {
    type: String,
    required: true // 'project', 'internship', 'hackathon', 'chat', etc.
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'action-taken', 'dismissed'],
    default: 'pending'
  },
  actionTaken: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);

