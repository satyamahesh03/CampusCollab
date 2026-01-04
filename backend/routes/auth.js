const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { getSignedJwtToken, protect } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Email domain validation - only allow @mvgrce.edu.in
const ALLOWED_EMAIL_DOMAIN = '@mvgrce.edu.in';

// Configure nodemailer transporter
const createTransporter = () => {
  // For development, you can use Gmail or any SMTP service
  // Make sure to set these in your .env file
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Fallback: Use Gmail with app password (for development)
    // You'll need to set SMTP_USER and SMTP_PASS in .env
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    });
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/send-otp
// @desc    Send OTP to email for registration
// @access  Public
router.post('/send-otp', [
  body('email').isEmail()
], async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email domain
    if (!normalizedEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      return res.status(400).json({
        success: false,
        message: `Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete any existing registration OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail, type: 'registration' });

    // Save new OTP
    const otpRecord = await OTP.create({
      email: normalizedEmail,
      otp,
      type: 'registration',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send OTP via email
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.SMTP_USER || 'noreply@campuscollab.com',
        to: normalizedEmail,
        subject: 'Campus Collab - Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #fef3c7, #fef9c3, #fef3c7); padding: 30px; border-radius: 12px;">
            <h2 style="color: #d97706; margin-bottom: 20px; text-align: center; font-size: 24px;">Campus Collab - Email Verification</h2>
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">Hello,</p>
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">Thank you for registering with Campus Collab. Please use the following OTP to verify your email address:</p>
            <div style="background: linear-gradient(to right, #fef3c7, #fef9c3); padding: 20px; text-align: center; margin: 25px 0; border-radius: 8px; border: 1px solid #fbbf24;">
              <p style="color: #d97706; font-size: 32px; margin: 0; letter-spacing: 6px; font-weight: bold;">${otp}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">This OTP will expire in 10 minutes.</p>
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">If you didn't request this OTP, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #fbbf24; margin: 25px 0;">
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">This is an automated message from Campus Collab. Please do not reply to this email.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      
      res.json({
        success: true,
        message: 'OTP sent successfully to your email'
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Still return success but log the error
      // In production, you might want to handle this differently
      res.json({
        success: true,
        message: 'OTP generated. Please check your email. If you don\'t receive it, check your spam folder.',
        // For development/testing, you might want to return the OTP
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error sending OTP'
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP before registration
// @access  Public
router.post('/verify-otp', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find OTP record (registration type)
    const otpRecord = await OTP.findOne({ 
      email: normalizedEmail,
      otp,
      type: 'registration',
      verified: false
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or already used. Please request a new OTP.'
      });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying OTP'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (requires verified OTP)
// @access  Public
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  body('department').notEmpty()
], async (req, res) => {
  try {
    const { name, email, password, role, department, year, skills, facultyCode } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email domain
    if (!normalizedEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      return res.status(400).json({
        success: false,
        message: `Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Verify OTP was verified
    const otpRecord = await OTP.findOne({ 
      email: normalizedEmail,
      verified: true
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email with OTP first'
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

    // Extract first 10 alphanumeric characters from email (local part before @) and convert to uppercase
    const emailLocalPart = normalizedEmail.split('@')[0];
    const rollNumber = emailLocalPart.replace(/[^A-Za-z0-9]/g, '').substring(0, 10).toUpperCase();

    // Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: role || 'student',
      department,
      year,
      rollNumber: rollNumber || '',
      skills: skills || []
    });

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

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
        rollNumber: user.rollNumber,
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
        rollNumber: user.rollNumber,
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
        rollNumber: user.rollNumber,
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
        rollNumber: user.rollNumber,
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
    const { name, department, year, rollNumber, skills, profilePicture, bio, websiteUrl, designation } = req.body;

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
      if (rollNumber !== undefined) user.rollNumber = rollNumber;
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
        rollNumber: user.rollNumber,
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

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP to email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail()
], async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email domain
    if (!normalizedEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      return res.status(400).json({
        success: false,
        message: `Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset OTP has been sent'
      });
    }

    // Generate OTP
    const otpCode = generateOTP();

    // Delete any existing password reset OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail, type: 'password-reset' });

    // Create new OTP
    const otp = await OTP.create({
      email: normalizedEmail,
      otp: otpCode,
      type: 'password-reset'
    });

    // Send email
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER || 'noreply@campuscollab.com',
      to: normalizedEmail,
      subject: 'Password Reset OTP - Campus Collab',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #fef3c7, #fef9c3, #fef3c7); padding: 30px; border-radius: 12px;">
          <h2 style="color: #f59e0b; margin-bottom: 20px; text-align: center; font-size: 24px;">Password Reset Request</h2>
          <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">You have requested to reset your password for Campus Collab.</p>
          <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">Your password reset OTP is:</p>
          <div style="background: linear-gradient(to right, #fef3c7, #fef9c3); padding: 20px; text-align: center; margin: 25px 0; border-radius: 8px; border: 1px solid #f59e0b;">
            <p style="color: #f59e0b; font-size: 32px; margin: 0; letter-spacing: 6px; font-weight: bold;">${otpCode}</p>
          </div>
          <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">This OTP will expire in 10 minutes.</p>
          <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 15px;">If you did not request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #fbbf24; margin: 25px 0;">
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">This is an automated message. Please do not reply.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Password reset OTP sent to your email'
    });
  } catch (error) {
    console.error('Error sending password reset OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending password reset OTP'
    });
  }
});

// @route   POST /api/auth/verify-reset-otp
// @desc    Verify password reset OTP
// @access  Public
router.post('/verify-reset-otp', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find OTP
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      otp,
      type: 'password-reset',
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Error verifying reset OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying OTP'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with verified OTP
// @access  Public
router.post('/reset-password', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find verified OTP
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      otp,
      type: 'password-reset',
      verified: true,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new password reset.'
      });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = password;
    await user.save();

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
});

module.exports = router;

