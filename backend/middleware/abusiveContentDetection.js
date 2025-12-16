const Report = require('../models/Report');
const abusiveWords = require('../config/abusiveWords');

// Simple rule-based abusive content detection.
const detectAbusiveContent = (text) => {
  const lowerText = text.toLowerCase();
  return abusiveWords.some((word) => lowerText.includes(word));
};

// Middleware to check for abusive content
exports.checkAbusiveContent = async (req, res, next) => {
  try {
    const content = req.body.text || req.body.content || req.body.comment;
    
    if (!content) {
      return next();
    }

    const isAbusive = detectAbusiveContent(content);

    if (isAbusive) {
      // Create a report
      await Report.create({
        reportType: req.body.messageType || 'comment',
        reportedUser: req.user._id,
        contentType: req.body.contentType || 'general',
        contentId: req.body.contentId || req.params.id,
        content: content,
        reason: 'Abusive language detected by AI system',
        reportedBy: 'AI System'
      });

      return res.status(400).json({
        success: false,
        message: 'Your message contains abusive content and has been reported to administrators',
        isAbusive: true
      });
    }

    req.isAbusive = false;
    next();
  } catch (error) {
    console.error('Error in abusive content detection:', error);
    next(); // Continue even if detection fails
  }
};

// Function to analyze and flag content (can be called directly)
exports.analyzeContent = async (content, userId, contentType, contentId) => {
  const isAbusive = detectAbusiveContent(content);
  
  if (isAbusive) {
    await Report.create({
      reportType: 'comment',
      reportedUser: userId,
      contentType: contentType,
      contentId: contentId,
      content: content,
      reason: 'Abusive language detected by AI system',
      reportedBy: 'AI System'
    });
  }
  
  return isAbusive;
};

