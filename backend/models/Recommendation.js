const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recommendedProjects: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    score: {
      type: Number,
      default: 0
    },
    reason: {
      type: String
    }
  }],
  courseRecommendations: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseLink'
    },
    score: {
      type: Number,
      default: 0
    },
    reason: {
      type: String
    }
  }],
  basedOnSkills: [{
    type: String
  }],
  basedOnDomains: [{
    type: String
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Recommendation', recommendationSchema);

