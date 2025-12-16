const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide internship title'],
    trim: true
  },
  company: {
    type: String,
    required: [true, 'Please provide company name']
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
    type: String,
    required: true
  }],
  eligibleYears: [{
    type: Number
  }],
  duration: {
    type: String,
    required: [true, 'Please provide internship duration']
  },
  stipend: {
    type: String,
    default: 'Unpaid'
  },
  location: {
    type: String,
    default: 'Remote'
  },
  mode: {
    type: String,
    enum: ['virtual', 'offline', 'hybrid'],
    required: true
  },
  applicationDeadline: {
    type: Date,
    required: true
  },
  requirements: {
    type: String
  },
  applyLink: {
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

module.exports = mongoose.model('Internship', internshipSchema);

