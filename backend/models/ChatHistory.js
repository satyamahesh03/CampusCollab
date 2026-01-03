const mongoose = require('mongoose');

// Lightweight model to track user pairs who have had approved chats
// This persists even after chats are deleted, allowing auto-approval for future chats
const chatHistorySchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstApprovedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index to ensure uniqueness of user pairs (order doesn't matter)
chatHistorySchema.index({ user1: 1, user2: 1 }, { unique: true });

// Static method to check if two users have chatted before
chatHistorySchema.statics.haveChattedBefore = async function(userId1, userId2) {
  // Check both directions since order doesn't matter
  const history = await this.findOne({
    $or: [
      { user1: userId1, user2: userId2 },
      { user1: userId2, user2: userId1 }
    ]
  });
  return !!history;
};

// Static method to record that two users have chatted
chatHistorySchema.statics.recordChatHistory = async function(userId1, userId2) {
  // Check if already exists
  const exists = await this.haveChattedBefore(userId1, userId2);
  if (!exists) {
    // Always store with smaller ID first for consistency
    const [user1, user2] = [userId1, userId2].sort((a, b) => 
      a.toString().localeCompare(b.toString())
    );
    await this.create({ user1, user2 });
  }
};

module.exports = mongoose.model('ChatHistory', chatHistorySchema);

