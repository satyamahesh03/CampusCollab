const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  isAbusive: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for finding chats between two users
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);

