const express = require('express');
const router = express.Router();
const Internship = require('../models/Internship');
const Reminder = require('../models/Reminder');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/internships
// @desc    Get all internships with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { domain, department, year, search, mode } = req.query;
    let query = {};

    // Filter out hidden posts for non-admin users (also include posts without isHidden field for backward compatibility)
    query.isHidden = { $ne: true };

    if (domain) {
      query.domain = domain;
    }

    if (department) {
      query.department = { $in: [department] };
    }

    if (year) {
      query.eligibleYears = { $in: [parseInt(year)] };
    }

    if (mode) {
      query.mode = mode;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter out expired internships (deadline passed)
    query.applicationDeadline = { $gte: new Date() };

    const internships = await Internship.find(query)
      .populate('postedBy', 'name department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: internships.length,
      data: internships
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching internships'
    });
  }
});

// @route   POST /api/internships
// @desc    Create a new internship
// @access  Private (Faculty)
router.post('/', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const internshipData = {
      ...req.body,
      postedBy: req.user._id
    };

    const internship = await Internship.create(internshipData);

    res.status(201).json({
      success: true,
      data: internship
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating internship'
    });
  }
});

// @route   PUT /api/internships/:id
// @desc    Update an internship (owner only)
// @access  Private (Internship Owner)
router.put('/:id', protect, async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    // Check if user is the owner
    if (internship.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this internship'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'postedBy' && key !== '_id') {
        internship[key] = req.body[key];
      }
    });

    await internship.save();

    res.json({
      success: true,
      data: internship
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating internship'
    });
  }
});

// @route   GET /api/internships/:id
// @desc    Get single internship by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('postedBy', 'name department email');

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    // Check if internship is hidden
    if (internship.isHidden) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    res.json({
      success: true,
      data: internship
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error fetching internship'
    });
  }
});

// @route   POST /api/internships/:id/like
// @desc    Like/Unlike an internship (adds to reminders)
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    const likeIndex = internship.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike - remove from likes and reminders
      internship.likes.splice(likeIndex, 1);
      await Reminder.findOneAndDelete({
        user: req.user._id,
        itemType: 'internship',
        itemId: internship._id
      });
    } else {
      // Like - add to likes and create/update reminder
      internship.likes.push(req.user._id);
      
      // Use findOneAndUpdate with upsert to avoid duplicate key errors
      await Reminder.findOneAndUpdate(
        {
          user: req.user._id,
          itemType: 'internship',
          itemId: internship._id
        },
        {
          user: req.user._id,
          itemType: 'internship',
          itemId: internship._id
        },
        {
          upsert: true,
          new: true
        }
      );
    }

    await internship.save();

    res.json({
      success: true,
      data: internship
    });
  } catch (error) {
    console.error('Error in internship like endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking internship',
      error: error.message
    });
  }
});

// @route   DELETE /api/internships/:id
// @desc    Delete an internship
// @access  Private (Faculty/Admin)
router.delete('/:id', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    // Check if user is the owner or admin
    if (internship.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this internship'
      });
    }

    await internship.deleteOne();

    res.json({
      success: true,
      message: 'Internship deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting internship'
    });
  }
});

module.exports = router;

