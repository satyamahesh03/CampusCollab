const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const User = require('../models/User');
const { getSignedJwtToken, protect } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  body('department').notEmpty()
], async (req, res) => {
  try {
    const { name, email, password, role, department, year, skills, facultyCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate faculty code if registering as faculty
    if (role === 'faculty') {
      if (facultyCode !== process.env.FACULTY_REGISTRATION_CODE) {
        return res.status(403).json({
          success: false,
          message: 'Invalid faculty registration code'
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      department,
      year,
      skills: skills || []
    });

    // Generate token
    const token = getSignedJwtToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        skills: user.skills,
        profilePicture: user.profilePicture,
        bio: user.bio,
        websiteUrl: user.websiteUrl,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is suspended
    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended',
        reason: user.suspensionReason
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = getSignedJwtToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        skills: user.skills,
        profilePicture: user.profilePicture,
        bio: user.bio,
        websiteUrl: user.websiteUrl,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        skills: user.skills,
        profilePicture: user.profilePicture,
        bio: user.bio,
        websiteUrl: user.websiteUrl,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/auth/user/:userId
// @desc    Get user profile by ID
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is suspended
    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'This user account has been suspended'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        skills: user.skills,
        profilePicture: user.profilePicture,
        bio: user.bio,
        websiteUrl: user.websiteUrl,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, department, year, skills, profilePicture, bio, websiteUrl, designation } = req.body;

    // Validate bio length
    if (bio && bio.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'About section cannot exceed 300 characters'
      });
    }

    // Validate websiteUrl if provided
    if (websiteUrl && !/^https?:\/\/.+/.test(websiteUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid URL starting with http:// or https://'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (department) user.department = department;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (bio !== undefined) user.bio = bio;
    
    // Student-specific fields
    if (user.role === 'student') {
      if (year) user.year = year;
      if (skills !== undefined) user.skills = skills;
      if (websiteUrl !== undefined) user.websiteUrl = websiteUrl;
    }
    
    // Faculty-specific fields
    if (user.role === 'faculty') {
      if (designation) user.designation = designation;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        skills: user.skills,
        profilePicture: user.profilePicture,
        bio: user.bio,
        websiteUrl: user.websiteUrl,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @route   POST /api/auth/block/:userId
// @desc    Block a user
// @access  Private
router.post('/block/:userId', protect, async (req, res) => {
  try {
    const userToBlock = await User.findById(req.params.userId);

    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.user._id.equals(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.blockedUsers) {
      user.blockedUsers = [];
    }

    // Check if already blocked
    if (user.blockedUsers.includes(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    user.blockedUsers.push(req.params.userId);
    await user.save();

    res.json({
      success: true,
      message: 'User blocked successfully',
      data: { blockedUsers: user.blockedUsers }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error blocking user'
    });
  }
});

// @route   POST /api/auth/unblock/:userId
// @desc    Unblock a user
// @access  Private
router.post('/unblock/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.blockedUsers || !user.blockedUsers.includes(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    user.blockedUsers = user.blockedUsers.filter(id => !id.equals(req.params.userId));
    await user.save();

    res.json({
      success: true,
      message: 'User unblocked successfully',
      data: { blockedUsers: user.blockedUsers }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error unblocking user'
    });
  }
});

// @route   GET /api/auth/blocked-users
// @desc    Get list of blocked users
// @access  Private
router.get('/blocked-users', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'name email profilePicture department');

    res.json({
      success: true,
      data: user.blockedUsers || []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching blocked users'
    });
  }
});

module.exports = router;

