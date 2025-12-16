const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/chats
// @desc    Get all chats for the logged-in user (excluding deleted and rejected)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ 
      participants: req.user._id,
      deletedBy: { $ne: req.user._id }, // Exclude chats deleted by this user
      status: { $in: ['pending', 'accepted'] } // Exclude rejected chats
    })
      .populate('participants', 'name email role department profilePicture')
      .populate('initiatedBy', 'name')
      .populate('messages.sender', 'name profilePicture')
      .sort({ lastMessage: -1 });

    res.json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching chats'
    });
  }
});

// @route   GET /api/chats/:userId
// @desc    Get or create a chat request with a specific user
// @access  Private
router.get('/:userId', protect, async (req, res) => {
  try {
    // First, check if they have ever had an accepted chat before (for approval history)
    const previousAcceptedChat = await Chat.findOne({
      participants: { $all: [req.user._id, req.params.userId] },
      status: 'accepted'
    });

    // Find existing ACTIVE chat between the two users (not deleted by current user)
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, req.params.userId] },
      deletedBy: { $ne: req.user._id }
    })
      .populate('participants', 'name email role department profilePicture')
      .populate('initiatedBy', 'name')
      .populate('messages.sender', 'name profilePicture');

    // If no active chat exists
    if (!chat) {
      // Determine initial status based on chat history
      let initialStatus = 'pending';
      
      // If they've ever had an accepted chat before, skip approval
      if (previousAcceptedChat) {
        initialStatus = 'accepted';
        console.log(`Users have chatted before - auto-approving new chat`);
      }

      // Create new chat
      chat = await Chat.create({
        participants: [req.user._id, req.params.userId],
        initiatedBy: req.user._id,
        status: initialStatus,
        messages: []
      });

      chat = await Chat.findById(chat._id)
        .populate('participants', 'name email role department profilePicture')
        .populate('initiatedBy', 'name');
    } else if (chat.deletedBy && chat.deletedBy.some(id => id.equals(req.user._id))) {
      // If user had deleted it, restore it for them
      chat.deletedBy = chat.deletedBy.filter(id => !id.equals(req.user._id));
      await chat.save();
    }

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching chat'
    });
  }
});

// @route   POST /api/chats/:chatId/message
// @desc    Send a message (also handled by Socket.io)
// @access  Private
router.post('/:chatId/message', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is a participant
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this chat'
      });
    }

    // Check if chat is pending and enforce 2-message limit for initiator
    if (chat.status === 'pending') {
      const isInitiator = chat.initiatedBy.equals(req.user._id);
      
      if (isInitiator) {
        // Count messages sent by initiator
        const initiatorMessages = chat.messages.filter(msg => msg.sender.equals(req.user._id));
        
        if (initiatorMessages.length >= 2) {
          return res.status(403).json({
            success: false,
            message: 'You can only send 2 messages before the other person approves'
          });
        }
      } else {
        // Recipient cannot send messages until they approve
        return res.status(403).json({
          success: false,
          message: 'Please approve the chat request first to send messages'
        });
      }
    }

    chat.messages.push({
      sender: req.user._id,
      content: req.body.content,
      status: 'sent'
    });

    // Update unread count for the other participant
    const otherParticipant = chat.participants.find(p => !p.equals(req.user._id));
    if (!chat.unreadCount) chat.unreadCount = new Map();
    const currentUnread = chat.unreadCount.get(otherParticipant.toString()) || 0;
    chat.unreadCount.set(otherParticipant.toString(), currentUnread + 1);

    chat.lastMessage = Date.now();
    await chat.save();

    await chat.populate('messages.sender', 'name profilePicture');

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error sending message'
    });
  }
});

// @route   PUT /api/chats/:chatId/mark-read
// @desc    Mark messages as read
// @access  Private
router.put('/:chatId/mark-read', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is a participant
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Mark all unread messages as read
    chat.messages.forEach(msg => {
      if (!msg.sender.equals(req.user._id) && msg.status !== 'read') {
        msg.status = 'read';
        msg.readAt = new Date();
      }
    });

    // Reset unread count for current user
    if (!chat.unreadCount) chat.unreadCount = new Map();
    chat.unreadCount.set(req.user._id.toString(), 0);

    await chat.save();

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error marking messages as read'
    });
  }
});

// @route   DELETE /api/chats/:chatId/message/:messageId
// @desc    Delete a message (soft delete)
// @access  Private
router.delete('/:chatId/message/:messageId', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const message = chat.messages.id(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can delete their own message
    if (!message.sender.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    message.isDeleted = true;
    message.content = 'This message was deleted';

    await chat.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting message'
    });
  }
});

// @route   GET /api/chats/users/search
// @desc    Search users to start a chat
// @access  Private
router.get('/users/search', protect, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id }, // Exclude current user
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name email department role profilePicture')
    .limit(10);

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error searching users'
    });
  }
});

// @route   PUT /api/chats/:chatId/approve
// @desc    Approve a pending chat request
// @access  Private
router.put('/:chatId/approve', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is a participant and not the initiator
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (chat.initiatedBy && chat.initiatedBy.equals(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve your own chat request'
      });
    }

    chat.status = 'accepted';
    await chat.save();

    res.json({
      success: true,
      message: 'Chat request accepted',
      data: chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error approving chat'
    });
  }
});

// @route   PUT /api/chats/:chatId/reject
// @desc    Reject a pending chat request
// @access  Private
router.put('/:chatId/reject', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is a participant and not the initiator
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (chat.initiatedBy && chat.initiatedBy.equals(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject your own chat request'
      });
    }

    chat.status = 'rejected';
    await chat.save();

    res.json({
      success: true,
      message: 'Chat request rejected'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting chat'
    });
  }
});

// @route   DELETE /api/chats/:chatId
// @desc    Delete chat for current user only (keeps in DB for approval history)
// @access  Private
router.delete('/:chatId', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is a participant
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Add user to deletedBy array (soft delete for this user only)
    if (!chat.deletedBy) chat.deletedBy = [];
    if (!chat.deletedBy.includes(req.user._id)) {
      chat.deletedBy.push(req.user._id);
    }

    // NEVER permanently delete - keep for approval history
    // Even if both users delete, we preserve the 'accepted' status for future re-chats
    await chat.save();

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting chat'
    });
  }
});

module.exports = router;

