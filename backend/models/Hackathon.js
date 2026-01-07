const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide hackathon title'],
    trim: true
  },
  organizer: {
    type: String,
    required: [true, 'Please provide organizer name']
  },
  description: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  department: [{
    type: String
  }],
  eligibleYears: [{
    type: Number
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  mode: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    required: true
  },
  location: {
    type: String
  },
  prizes: {
    type: String
  },
  registrationLink: {
    type: String,
    required: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isHidden: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
hackathonSchema.index({ isHidden: 1, endDate: 1 });
hackathonSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Hackathon', hackathonSchema);

