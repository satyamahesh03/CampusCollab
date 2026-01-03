const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a project title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a project description']
  },
  domains: [{
    type: String,
    required: true
  }],
  skills: [{
    type: String,
    trim: true
  }],
  requiredRoles: [{
    role: String,
    count: Number,
    filled: {
      type: Number,
      default: 0
    }
  }],
  teamRequirements: {
    type: String
  },
  gitLink: {
    type: String
  },
  department: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'in-progress'],
    default: 'open'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    isAbusive: {
      type: Boolean,
      default: false
    },
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      isAbusive: {
        type: Boolean,
        default: false
      },
      upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      // Nested replies for tree structure (up to 3 levels)
      replies: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        text: String,
        createdAt: {
          type: Date,
          default: Date.now
        },
        isAbusive: {
          type: Boolean,
          default: false
        },
        upvotes: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }],
        downvotes: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }],
        // Third level replies
        replies: [{
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          text: String,
          createdAt: {
            type: Date,
            default: Date.now
          },
          isAbusive: {
            type: Boolean,
            default: false
          },
          upvotes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }],
          downvotes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }]
        }]
      }]
    }]
  }],
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  joinRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  commentsDisabled: {
    type: Boolean,
    default: false
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', projectSchema);

