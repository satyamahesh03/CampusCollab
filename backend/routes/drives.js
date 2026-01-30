const express = require('express');
const router = express.Router();
const Drive = require('../models/Drive');
const Reminder = require('../models/Reminder');
const { protect, authorize } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// @route   POST /api/drives/parse-description
// @desc    Parse drive description using AI to extract details
// @access  Private (Faculty/Admin)
router.post('/parse-description', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'No text provided'
      });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.warn('GOOGLE_GEMINI_API_KEY not found in environment variables');
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable'
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

    // Helper function to list available models using the API key
    // This needs to be defined inside or imported
    const listAvailableModels = async () => {
      try {
        const response = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GEMINI_API_KEY}`
        );
        return response.data.models.map(model => model.name);
      } catch (error) {
        console.error('Error listing models:', error.message);
        throw error;
      }
    };

    // First, try to get available models from the API
    let availableModels = [];
    try {
      availableModels = await listAvailableModels();
      console.log('Available models found via API:', availableModels.length);
    } catch (error) {
      console.log('Could not list available models, using default list');
    }

    // Extract model names and filter for gemini models
    // If API listing failed, use a robust fallback list
    const modelNamesToTry = availableModels.length > 0
      ? availableModels
        .map(name => name.replace('models/', ''))
        .filter(name => name.includes('gemini'))
      : [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-1.0-pro"
      ];

    // Add models/ prefix versions to fallback list just in case SDK needs them
    if (availableModels.length === 0) {
      modelNamesToTry.push(
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro",
        "models/gemini-pro"
      );
    }

    const prompt = `
      Extract the following details from the placement drive description below and return ONLY a valid JSON object.
      
      Fields to extract:
      - title: A short title for the drive (e.g. "Software Engineer Hiring", "Campus Drive 2026")
      - company: Company name
      - jobRole: Job role/title (e.g. "Software Engineer", "Business Analyst")
      - package: CTC or salary package (e.g. "12 LPA", "6.5 LPA")
      - stipend: Internship stipend if applicable (e.g. "20k/month", "Unpaid")
      - internshipDuration: Duration of internship (e.g. "6 months", "3 months")
      - serviceAgreement: Bond or Service Level Agreement (SLA) details (e.g. "2 years bond", "None")
      - selectionProcess: Steps in selection (e.g. "Resume Shortlisting -> Online Test -> Interview")
      - eligibleYears: Array of graduation years (numbers only, e.g. [2025, 2026])
      - cgpaCriteria: Minimum CGPA (number, e.g. 7.5. Use 0 if not mentioned)
      - description: The full original text, strictly preserving all original line breaks, spacing, bullet points, and structure. Do not summarize.
      - driveDate: Date of the drive (ISO format YYYY-MM-DD if found, otherwise estimated future date)
      - registrationDeadline: Last date to register (ISO format YYYY-MM-DD)
      - location: Job location or "Remote" or "Online" (default "Hybrid" if not found)
      - registrationLink: URL for registration
      - department: Array of eligible departments (e.g. ["CSE", "ECE", "IT", "MECH"])
      - requirements: Specific skills or requirements mentioning technology stacks etc.

      Rules:
      - If a field is not found, use an empty string "" or empty array [] or 0 for numbers.
      - eligibleYears should be 4-digit numbers.
      - department should be normalized to standard abbreviations (CSE, ECE, EEE, MECH, CIVIL, MBA, MCA, IT).
      - driveDate and registrationDeadline should be properly formatted dates. 
      - If no year is explicitly mentioned for dates but a month/day is, assume the current or next occurrence.
      
      Text to analyze:
      """
      ${text}
      """
    `;

    let lastError = null;
    let textResponse = null;

    // Try each model sequentially
    for (const modelName of modelNamesToTry) {
      try {
        console.log(`Attempting to use model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        textResponse = response.text();

        // If successful, break the loop
        if (textResponse) {
          console.log(`Successfully used model: ${modelName}`);
          break;
        }
      } catch (err) {
        console.warn(`Failed to use model ${modelName}:`, err.message);
        lastError = err;
        // Continue to next model
      }
    }

    if (!textResponse) {
      throw lastError || new Error(`All models failed to generate content. Checked: ${modelNamesToTry.join(', ')}`);
    }

    // Clean up markdown code blocks if present to parse JSON
    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    let extractedData;
    try {
      extractedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', textResponse);
      return res.status(500).json({
        success: false,
        message: 'Failed to parse extracted data',
        rawResponse: textResponse // Send back raw text for debugging
      });
    }

    res.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('Error parsing description:', error);
    // Send detailed error message in development
    res.status(500).json({
      success: false,
      message: 'Server error processing text',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// @route   GET /api/drives
// @desc    Get all placement drives with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { department, year, search, status } = req.query;
    let query = {};

    // Filter out hidden posts for non-admin users (also include posts without isHidden field for backward compatibility)
    query.isHidden = { $ne: true };

    if (department) {
      query.department = { $in: [department] };
    }

    if (year) {
      query.eligibleYears = { $in: [parseInt(year)] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { jobRole: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status (active or completed)
    if (status === 'completed') {
      // Show drives where drive date has passed
      query.driveDate = { $lt: new Date() };
    } else {
      // Default: show active/upcoming drives
      query.driveDate = { $gte: new Date() };
    }

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Drive.countDocuments(query);

    // Fetch with optimized fields and lean for performance
    const drives = await Drive.find(query)
      .select('title company description department eligibleYears cgpaCriteria jobRole package driveDate registrationDeadline location registrationLink requirements likes createdAt postedBy')
      .populate('postedBy', 'name department')
      .lean()
      .sort({ driveDate: status === 'completed' ? -1 : 1 })
      .skip(skip)
      .limit(limit);

    // Convert likes to count
    const drivesWithCounts = drives.map(drive => ({
      ...drive,
      likes: drive.likes?.length || 0
    }));

    res.json({
      success: true,
      count: drivesWithCounts.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: drivesWithCounts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching drives'
    });
  }
});

// @route   POST /api/drives
// @desc    Create a new placement drive
// @access  Private (Faculty)
router.post('/', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const driveData = {
      ...req.body,
      postedBy: req.user._id
    };

    const drive = await Drive.create(driveData);

    res.status(201).json({
      success: true,
      data: drive
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating drive'
    });
  }
});

// @route   PUT /api/drives/:id
// @desc    Update a drive (owner only)
// @access  Private (Drive Owner)
router.put('/:id', protect, async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Check if user is the owner
    if (drive.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this drive'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'postedBy' && key !== '_id') {
        drive[key] = req.body[key];
      }
    });

    await drive.save();

    res.json({
      success: true,
      data: drive
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating drive'
    });
  }
});

// @route   GET /api/drives/:id
// @desc    Get single drive by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id)
      .populate('postedBy', 'name department email');

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Check if drive is hidden
    if (drive.isHidden) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    res.json({
      success: true,
      data: drive
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error fetching drive'
    });
  }
});

// @route   POST /api/drives/:id/like
// @desc    Like/Unlike a drive (adds to reminders)
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    const likeIndex = drive.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike - remove from likes and reminders
      drive.likes.splice(likeIndex, 1);
      await Reminder.findOneAndDelete({
        user: req.user._id,
        itemType: 'drive',
        itemId: drive._id
      });
    } else {
      // Like - add to likes and create/update reminder
      drive.likes.push(req.user._id);

      // Use findOneAndUpdate with upsert to avoid duplicate key errors
      await Reminder.findOneAndUpdate(
        {
          user: req.user._id,
          itemType: 'drive',
          itemId: drive._id
        },
        {
          user: req.user._id,
          itemType: 'drive',
          itemId: drive._id
        },
        {
          upsert: true,
          new: true
        }
      );
    }

    await drive.save();

    res.json({
      success: true,
      data: drive
    });
  } catch (error) {
    console.error('Error in drive like endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking drive',
      error: error.message
    });
  }
});

// @route   DELETE /api/drives/:id
// @desc    Delete a drive
// @access  Private (Faculty/Admin)
router.delete('/:id', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Check if user is the owner or admin
    if (drive.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this drive'
      });
    }

    await drive.deleteOne();

    res.json({
      success: true,
      message: 'Drive deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting drive'
    });
  }
});

// @route   POST /api/drives/verify-gmail-code
// @desc    Verify the secret code for sending drive emails
// @access  Private
router.post('/verify-gmail-code', protect, authorize('faculty', 'admin'), (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Code is required'
    });
  }

  if (!process.env.GMAIL_SECRET_CODE) {
    console.warn('GMAIL_SECRET_CODE not set in backend env');
    // If code is not set on server, disallow (or could allow default for dev)
    return res.status(500).json({
      success: false,
      message: 'Server configuration error'
    });
  }

  if (code.trim() === process.env.GMAIL_SECRET_CODE.trim()) {
    return res.json({
      success: true,
      message: 'Code verified successfully'
    });
  } else {
    return res.status(403).json({
      success: false,
      message: 'Invalid secret code'
    });
  }
});

// @route   POST /api/drives/send-emails
// @desc    Send emails to eligible students for a newly created drive
// @access  Private (Faculty/Admin)
// NOTE: This should technically call an email service. Since we don't have a mailer set up in this context,
// we will simulate the "Sending..." process and log the intent. In a real app, this would use nodemailer.
const nodemailer = require('nodemailer');
const User = require('../models/User'); // Ensure User model is imported

// @route   POST /api/drives/:id/send-emails
// @desc    Send emails to eligible students for a newly created drive
// @access  Private (Faculty/Admin)
router.post('/:id/send-emails', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    // Department Normalization Mapping 
    // Maps short codes to possible full names used in student profiles
    // Department Normalization Mapping 
    // Maps short codes to possible full names used in student profiles
    const departmentAliases = {
      'CSE': ['CSE', 'Computer Science', 'Computer Science and Engineering', 'CS', 'C.S.E.', 'Computer Science Engineering'],
      'ECE': ['ECE', 'Electronics and Communication', 'Electronics & Communication Engineering', 'Electronics', 'Electronics and Communication Engineering'],
      'EEE': ['EEE', 'Electrical and Electronics', 'Electrical & Electronics Engineering', 'Electrical and Electronics Engineering', 'Electrical'],
      'MECH': ['MECH', 'Mechanical', 'Mechanical Engineering'],
      'CIVIL': ['CIVIL', 'Civil', 'Civil Engineering'],
      'IT': ['IT', 'Information Technology'],
      'CSM': ['CSM', 'AIML', 'Artificial Intelligence', 'AI & ML', 'CSE (AI&ML)', 'AI and ML'],
      'CSD': ['CSD', 'Data Science', 'CSE (Data Science)', 'DS'],
      'CIC': ['CIC', 'Cyber Security', 'loT', 'CS (Cyber Security)', 'IoT', 'Internet of Things'],
      'CSIT': ['CSIT', 'Computer Science and Information Technology', 'CS & IT'],
      'CHEM': ['CHEM', 'Chemical', 'Chemical Engineering'],
      'MBA': ['MBA', 'Business Administration', 'Management', 'Business Management'],
      'MCA': ['MCA', 'Computer Applications', 'Master of Computer Applications']
    };

    // Expand allowed departments to include all aliases
    // eligibleDeps will strictly contain short codes from the Drive model (e.g., ['CSE', 'ECE'])
    // We want to query Users who might have 'Computer Science' instead of 'CSE'
    let expandedDepartments = [];

    if (drive.department && Array.isArray(drive.department)) {
      drive.department.forEach(dept => {
        // Add the original department itself
        expandedDepartments.push(dept);

        // Add any aliases if they exist in our map
        // We check upper case key to be safe
        const upperDept = dept.toUpperCase();
        if (departmentAliases[upperDept]) {
          expandedDepartments = [...expandedDepartments, ...departmentAliases[upperDept]];
        }
      });
    }

    // Remove duplicates
    expandedDepartments = [...new Set(expandedDepartments)];

    // Find eligible students
    // Use the expandedDepartments list to match student profiles
    const eligibleStudents = await User.find({
      role: 'student',
      department: { $in: expandedDepartments }, // Matches any alias
      year: { $in: drive.eligibleYears },
      isActive: true,
      isSuspended: false
    }).select('email name');

    if (eligibleStudents.length === 0) {
      return res.json({
        success: true,
        message: 'No eligible students found to send emails to.'
      });
    }

    console.log(`Found ${eligibleStudents.length} eligible students for drive: ${drive.title}`);

    // Configure Email Transporter
    // In a real production app, use a robust service like SendGrid, AWS SES, etc.
    // For this use case, we use Gmail SMTP if credentials exist.
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Send emails in parallel (or use a queue in production)
      const emailPromises = eligibleStudents.map(student => {
        const mailOptions = {
          from: `"CampusCollab Placement Cell" <${process.env.SMTP_USER}>`,
          to: student.email,
          subject: `New Placement Drive: ${drive.company} - ${drive.jobRole}`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 0; border: 1px solid #fcd34d; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
              <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">New Opportunity Alert</h2>
              </div>
              
              <div style="padding: 30px; background-color: #fffbeb;">
                <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hello <strong>${student.name}</strong>,</p>
                <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 25px;">A new placement drive has been announced that matches your profile details. Please review the criteria below.</p>
                
                <div style="background-color: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <h3 style="margin-top: 0; margin-bottom: 15px; color: #111827; font-size: 20px; border-bottom: 2px solid #fcd34d; padding-bottom: 10px;">${drive.company}</h3>
                  
                  <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                    <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Role</p>
                      <p style="margin: 0; color: #111827; font-weight: 600; font-size: 16px;">${drive.jobRole}</p>
                    </div>
                    <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Package</p>
                      <p style="margin: 0; color: #059669; font-weight: 600; font-size: 16px;">${drive.package}</p>
                    </div>
                    <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Location</p>
                      <p style="margin: 0; color: #111827; font-weight: 500; font-size: 16px;">${drive.location}</p>
                    </div>
                    <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Deadline</p>
                      <p style="margin: 0; color: #dc2626; font-weight: 600; font-size: 16px;">${new Date(drive.registrationDeadline).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                  
                  <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0 0 10px 0; font-weight: 600; color: #374151;">Description</p>
                    <div style="font-size: 14px; color: #4b5563; white-space: pre-wrap; line-height: 1.5;">${drive.description}</div>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://cc.satyapage.in/drives" style="display: inline-block; background-color: #d97706; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.4); transition: background-color 0.2s;">
                    View Details & Apply
                  </a>
                  <p style="margin-top: 15px; font-size: 13px; color: #9ca3af;">Clicking above will take you to the Campus Collab portal.</p>
                </div>
              </div>
              
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #6b7280; margin: 0;">&copy; ${new Date().getFullYear()} Campus Collab Placement Cell. All rights reserved.</p>
              </div>
            </div>
          `
        };

        // Log individual send attempt (silent failure to prevent crashing the loop)
        return transporter.sendMail(mailOptions).catch(err => console.error(`Failed to send email to ${student.email}:`, err.message));
      });

      await Promise.all(emailPromises);

      console.log(`Emails sent successfully to ${eligibleStudents.length} students.`);
    } else {
      // Mock mode if no credentials
      console.log(`[MOCK EMAIL SENDING] Credentials missing. Would have sent to: ${eligibleStudents.map(s => s.email).join(', ')}`);
    }

    res.json({
      success: true,
      message: `Emails queued for ${eligibleStudents.length} eligible students`
    });

  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ success: false, message: 'Failed to send emails' });
  }
});

module.exports = router;

