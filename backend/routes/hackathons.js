const express = require('express');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const Reminder = require('../models/Reminder');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/hackathons
// @desc    Get all hackathons with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { domain, year, search, sort } = req.query;
    let query = {};

    // Filter out hidden posts for non-admin users (also include posts without isHidden field for backward compatibility)
    query.isHidden = { $ne: true };

    if (domain) {
      query.domain = domain;
    }

    if (year) {
      query.eligibleYears = { $in: [parseInt(year)] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { organizer: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter out hackathons where end date has passed
    query.endDate = { $gte: new Date() };

    let hackathons = await Hackathon.find(query)
      .populate('postedBy', 'name department role');

    // Sort by trending (likes count) if requested
    if (sort === 'trending') {
      hackathons = hackathons.sort((a, b) => b.likes.length - a.likes.length);
    } else {
      hackathons = hackathons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({
      success: true,
      count: hackathons.length,
      data: hackathons
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching hackathons'
    });
  }
});

// @route   POST /api/hackathons
// @desc    Create a new hackathon
// @access  Private (Faculty & Students)
router.post('/', protect, authorize('student', 'faculty'), async (req, res) => {
  try {
    const hackathonData = {
      ...req.body,
      postedBy: req.user._id
    };

    const hackathon = await Hackathon.create(hackathonData);

    res.status(201).json({
      success: true,
      data: hackathon
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating hackathon'
    });
  }
});

// @route   PUT /api/hackathons/:id
// @desc    Update a hackathon (owner only)
// @access  Private (Hackathon Owner)
router.put('/:id', protect, async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }

    // Check if user is the owner
    if (hackathon.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this hackathon'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'postedBy' && key !== '_id') {
        hackathon[key] = req.body[key];
      }
    });

    await hackathon.save();

    res.json({
      success: true,
      data: hackathon
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating hackathon'
    });
  }
});

// @route   GET /api/hackathons/:id
// @desc    Get single hackathon by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id)
      .populate('postedBy', 'name department email role');

    if (!hackathon) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }

    // Check if hackathon is hidden
    if (hackathon.isHidden) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }

    res.json({
      success: true,
      data: hackathon
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error fetching hackathon'
    });
  }
});

// @route   POST /api/hackathons/:id/like
// @desc    Like/Unlike a hackathon (adds to reminders)
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }

    const likeIndex = hackathon.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike - remove from likes and reminders
      hackathon.likes.splice(likeIndex, 1);
      await Reminder.findOneAndDelete({
        user: req.user._id,
        itemType: 'hackathon',
        itemId: hackathon._id
      });
    } else {
      // Like - add to likes and create/update reminder
      hackathon.likes.push(req.user._id);
      
      // Use findOneAndUpdate with upsert to avoid duplicate key errors
      await Reminder.findOneAndUpdate(
        {
          user: req.user._id,
          itemType: 'hackathon',
          itemId: hackathon._id
        },
        {
          user: req.user._id,
          itemType: 'hackathon',
          itemId: hackathon._id
        },
        {
          upsert: true,
          new: true
        }
      );
    }

    await hackathon.save();

    res.json({
      success: true,
      data: hackathon
    });
  } catch (error) {
    console.error('Error in hackathon like endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking hackathon',
      error: error.message
    });
  }
});

// @route   DELETE /api/hackathons/:id
// @desc    Delete a hackathon
// @access  Private (Owner/Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }

    // Check if user is the owner or admin
    if (hackathon.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this hackathon'
      });
    }

    await hackathon.deleteOne();

    res.json({
      success: true,
      message: 'Hackathon deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting hackathon'
    });
  }
});

module.exports = router;

