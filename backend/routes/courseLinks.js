const express = require('express');
const router = express.Router();
const CourseLink = require('../models/CourseLink');
const { protect, authorize } = require('../middleware/auth');
const axios = require('axios');
const cheerio = require('cheerio');

// Common skills list for extraction
const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust',
  'PHP', 'Ruby', 'SQL', 'NoSQL', 'HTML', 'CSS', 'React', 'Angular', 'Vue',
  'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring',
  'Laravel', 'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Firebase',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
  'REST APIs', 'GraphQL', 'Microservices', 'TensorFlow', 'PyTorch',
  'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib', 'Data Visualization',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'MLOps',
  'Data Engineering', 'Big Data', 'Hadoop', 'Spark', 'Tableau', 'Power BI',
  'Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Accessibility',
  'Cybersecurity', 'Penetration Testing', 'Network Security', 'Cloud Security',
  'DevOps', 'Embedded Systems', 'IoT', 'Robotics', 'Arduino', 'Raspberry Pi',
  'Blockchain', 'Smart Contracts', 'Solidity', 'Web3', 'Testing', 'Jest',
  'Cypress', 'Playwright', 'QA Automation', 'Agile', 'Scrum',
  'Project Management', 'Technical Writing'
];

// Extract skills from text
const extractSkills = (text) => {
  if (!text) return [];
  
  const textLower = text.toLowerCase();
  const extractedSkills = [];
  
  // Sort skills by length (longest first) to match multi-word skills first
  const sortedSkills = [...COMMON_SKILLS].sort((a, b) => b.length - a.length);
  
  for (const skill of sortedSkills) {
    const skillLower = skill.toLowerCase();
    // Use word boundary or case-insensitive matching
    // Match if skill appears as a whole word or phrase in the text
    const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(textLower) && !extractedSkills.includes(skill)) {
      extractedSkills.push(skill);
    }
  }
  
  return extractedSkills.slice(0, 10); // Limit to 10 skills
};

// @route   GET /api/course-links
// @desc    Get all course links with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, department, subject, search } = req.query;
    let query = {};

    // Filter out hidden posts for non-admin users (also include posts without isHidden field for backward compatibility)
    query.isHidden = { $ne: true };

    if (category) {
      query.category = category;
    }

    if (department) {
      query.department = department;
    }

    if (subject) {
      query.subject = subject;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } }
      ];
    }

    const courseLinks = await CourseLink.find(query)
      .populate('postedBy', 'name department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courseLinks.length,
      data: courseLinks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course links'
    });
  }
});

// @route   POST /api/course-links/fetch-metadata
// @desc    Fetch metadata from a URL
// @access  Private (Faculty)
router.post('/fetch-metadata', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    // Fetch the HTML content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract metadata
    let title = $('meta[property="og:title"]').attr('content') || 
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text() ||
                'Course';

    let description = $('meta[property="og:description"]').attr('content') ||
                     $('meta[name="twitter:description"]').attr('content') ||
                     $('meta[name="description"]').attr('content') ||
                     '';

    let image = $('meta[property="og:image"]').attr('content') ||
               $('meta[name="twitter:image"]').attr('content') ||
               '';

    // Clean up title and description
    title = title.trim().substring(0, 200);
    description = description.trim().substring(0, 500);

    // Extract skills from title and description
    const combinedText = `${title} ${description}`;
    const skills = extractSkills(combinedText);

    res.json({
      success: true,
      data: {
        title,
        description,
        image,
        skills
      }
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course details from URL',
      error: error.message
    });
  }
});

// @route   POST /api/course-links
// @desc    Create a new course link
// @access  Private (Faculty)
router.post('/', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const courseLinkData = {
      ...req.body,
      postedBy: req.user._id
    };

    const courseLink = await CourseLink.create(courseLinkData);

    res.status(201).json({
      success: true,
      data: courseLink
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating course link'
    });
  }
});

// @route   GET /api/course-links/:id
// @desc    Get single course link by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const courseLink = await CourseLink.findById(req.params.id)
      .populate('postedBy', 'name department email');

    if (!courseLink) {
      return res.status(404).json({
        success: false,
        message: 'Course link not found'
      });
    }

    // Check if course link is hidden
    if (courseLink.isHidden) {
      return res.status(404).json({
        success: false,
        message: 'Course link not found'
      });
    }

    res.json({
      success: true,
      data: courseLink
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Course link not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error fetching course link'
    });
  }
});

// @route   DELETE /api/course-links/:id
// @desc    Delete a course link
// @access  Private (Faculty/Admin)
router.delete('/:id', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const courseLink = await CourseLink.findById(req.params.id);

    if (!courseLink) {
      return res.status(404).json({
        success: false,
        message: 'Course link not found'
      });
    }

    // Check if user is the owner or admin
    if (courseLink.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course link'
      });
    }

    await courseLink.deleteOne();

    res.json({
      success: true,
      message: 'Course link deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting course link'
    });
  }
});

module.exports = router;

