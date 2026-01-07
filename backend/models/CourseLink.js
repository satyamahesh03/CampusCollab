const mongoose = require('mongoose');

const courseLinkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide course title'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General'
  },
  department: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: 'General'
  },
  skills: [{
    type: String,
    trim: true
  }],
  link: {
    type: String,
    required: [true, 'Please provide course link']
  },
  image: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['video', 'document', 'website', 'other'],
    default: 'other'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
courseLinkSchema.index({ isHidden: 1 });
courseLinkSchema.index({ createdAt: 1 });

module.exports = mongoose.model('CourseLink', courseLinkSchema);

