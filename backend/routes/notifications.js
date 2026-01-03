const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Reminder = require('../models/Reminder');
const Internship = require('../models/Internship');
const Hackathon = require('../models/Hackathon');
const Drive = require('../models/Drive');
const { protect } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get all notifications for the logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get reminders for the reminders section
    const reminders = await Reminder.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    // Populate the actual reminder items
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
      data: {
        notifications: notifications,
        reminders: validReminders,
        unreadCount: notifications.filter(n => !n.isRead).length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notifications'
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error marking all notifications as read'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notification as read'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting notification'
    });
  }
});

module.exports = router;

