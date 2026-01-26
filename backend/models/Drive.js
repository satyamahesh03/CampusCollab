const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide drive title'],
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
  department: [{
    type: String,
    required: true
  }],
  eligibleYears: [{
    type: Number,
    required: true
  }],
  cgpaCriteria: {
    type: Number,
    default: 0
  },
  jobRole: {
    type: String,
    required: true
  },
  package: {
    type: String,
    required: true
  },
  driveDate: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  requirements: {
    type: String
  },
  stipend: {
    type: String,
    default: ''
  },
  internshipDuration: {
    type: String,
    default: ''
  },
  serviceAgreement: {
    type: String,
    default: ''
  },
  selectionProcess: {
    type: String,
    default: ''
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
driveSchema.index({ isHidden: 1, driveDate: 1 });
driveSchema.index({ createdAt: 1 });
driveSchema.index({ driveDate: 1 });

module.exports = mongoose.model('Drive', driveSchema);

