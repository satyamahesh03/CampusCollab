const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  department: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: function() {
      return this.role === 'student';
    }
  },
  rollNumber: {
    type: String,
    default: '',
    maxlength: [10, 'Roll number cannot exceed 10 characters']
  },
  skills: [{
    type: String
  }],
  profilePicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: '',
    maxlength: [300, 'About section cannot exceed 300 characters']
  },
  websiteUrl: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  designation: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: {
    type: String,
    default: ''
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Auto-set rollNumber from email if not provided (for students)
userSchema.pre('save', function(next) {
  // Only set rollNumber if it's empty and user is a student
  if (!this.rollNumber && this.role === 'student' && this.email) {
    const emailLocalPart = this.email.split('@')[0];
    // Extract first 10 alphanumeric characters and convert to uppercase
    this.rollNumber = emailLocalPart.replace(/[^A-Za-z0-9]/g, '').substring(0, 10).toUpperCase();
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add indexes for better query performance
userSchema.index({ isSuspended: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);

