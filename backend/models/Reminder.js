const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemType: {
    type: String,
    enum: ['internship', 'hackathon', 'drive'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index to prevent duplicate reminders
reminderSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Reminder', reminderSchema);

