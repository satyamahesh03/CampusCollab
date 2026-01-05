const express = require('express');
const router = express.Router();
const Drive = require('../models/Drive');
const Reminder = require('../models/Reminder');
const { protect, authorize } = require('../middleware/auth');

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

    const drives = await Drive.find(query)
      .populate('postedBy', 'name department')
      .sort({ driveDate: status === 'completed' ? -1 : 1 }); // Completed: newest first, Active: soonest first

    res.json({
      success: true,
      count: drives.length,
      data: drives
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

module.exports = router;

