const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['comment_reply', 'reminder', 'project_join_request', 'content_approved', 'content_warning', 'account_suspended', 'account_unsuspended'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // For comment reply notifications
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  commentId: {
    type: String
  },
  replyId: {
    type: String
  },
  // For reminder notifications
  reminderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

