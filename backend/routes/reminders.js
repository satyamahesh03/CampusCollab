const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const Internship = require('../models/Internship');
const Hackathon = require('../models/Hackathon');
const Drive = require('../models/Drive');
const { protect } = require('../middleware/auth');

// @route   GET /api/reminders
// @desc    Get all reminders for the logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    // Populate the actual items
    const populatedReminders = await Promise.all(
      reminders.map(async (reminder) => {
        let item;
        if (reminder.itemType === 'internship') {
          item = await Internship.findById(reminder.itemId);
        } else if (reminder.itemType === 'hackathon') {
          item = await Hackathon.findById(reminder.itemId);
        } else if (reminder.itemType === 'drive') {
          item = await Drive.findById(reminder.itemId);
        }

        return {
          _id: reminder._id,
          itemType: reminder.itemType,
          item: item,
          createdAt: reminder.createdAt
        };
      })
    );

    // Filter out reminders where the item was deleted
    const validReminders = populatedReminders.filter(r => r.item !== null);

    res.json({
      success: true,
      count: validReminders.length,
      data: validReminders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reminders'
    });
  }
});

// @route   DELETE /api/reminders/:id
// @desc    Delete a reminder
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Check if user owns this reminder
    if (reminder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reminder'
      });
    }

    await reminder.deleteOne();

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting reminder'
    });
  }
});

module.exports = router;

