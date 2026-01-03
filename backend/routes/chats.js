const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const ChatHistory = require('../models/ChatHistory');
const { protect } = require('../middleware/auth');

// Generate unique chat code
const generateChatCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// @route   GET /api/chats
// @desc    Get all approved chats for the logged-in user (excluding deleted and rejected)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ 
      participants: req.user._id,
      status: 'accepted' // Only approved chats
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

// @route   GET /api/chats/requests
// @desc    Get all pending message requests (where user is NOT the initiator)
// @access  Private
router.get('/requests', protect, async (req, res) => {
  try {
    const requests = await Chat.find({ 
      participants: req.user._id,
      status: 'pending',
      initiatedBy: { $ne: req.user._id } // Only requests where user is NOT the initiator
    })
      .populate('participants', 'name email role department profilePicture')
      .populate('initiatedBy', 'name profilePicture')
      .populate('messages.sender', 'name profilePicture')
      .sort({ lastMessage: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching message requests'
    });
  }
});

// @route   GET /api/chats/code/:chatCode
// @desc    Get chat by unique code
// @access  Private
router.get('/code/:chatCode', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      chatCode: req.params.chatCode,
      participants: req.user._id
    })
      .populate('participants', 'name email role department profilePicture')
      .populate('initiatedBy', 'name')
      .populate('messages.sender', 'name profilePicture');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Chat is already available if it exists (no soft delete anymore)

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

// @route   GET /api/chats/:userId
// @desc    Get or create a chat request with a specific user
// @access  Private
router.get('/:userId', protect, async (req, res) => {
  try {
    // Check if they have ever had an approved chat before (even if deleted)
    const haveChattedBefore = await ChatHistory.haveChattedBefore(req.user._id, req.params.userId);

    // Find existing chat between the two users
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, req.params.userId] },
      status: { $in: ['pending', 'accepted'] } // Only get pending or accepted chats
    })
      .populate('participants', 'name email role department profilePicture')
      .populate('initiatedBy', 'name')
      .populate('messages.sender', 'name profilePicture');

    // If no chat exists, create a new one
    if (!chat) {
      // Determine initial status based on chat history
      let initialStatus = 'pending';
      let chatCode = null;
      
      // If they've ever had an approved chat before (even if deleted), auto-approve
      if (haveChattedBefore) {
        initialStatus = 'accepted';
        chatCode = generateChatCode();
        console.log(`Users have chatted before - auto-approving new chat with code: ${chatCode}`);
      }

      // Create new chat
      chat = await Chat.create({
        participants: [req.user._id, req.params.userId],
        initiatedBy: req.user._id,
        status: initialStatus,
        chatCode: chatCode,
        messages: []
      });

      chat = await Chat.findById(chat._id)
        .populate('participants', 'name email role department profilePicture')
        .populate('initiatedBy', 'name');
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

    // No need to restore chat anymore since we're using hard delete

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

    // Update unread count for the other participant (already declared above)
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
    
    // Generate unique chat code if not already exists
    if (!chat.chatCode) {
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = generateChatCode();
        const existingChat = await Chat.findOne({ chatCode: code });
        if (!existingChat) {
          isUnique = true;
        }
      }
      chat.chatCode = code;
    }
    
    await chat.save();
    
    // Record in chat history that these users have had an approved chat
    // This persists even if the chat is later deleted, allowing auto-approval for future chats
    await ChatHistory.recordChatHistory(chat.participants[0], chat.participants[1]);

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
// @desc    Request to delete chat (requires both users' approval)
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

    // Check if there's already a delete request
    if (chat.deleteRequestStatus === 'pending') {
      // If the other user already requested deletion, approve it immediately
      if (chat.deleteRequestedBy && !chat.deleteRequestedBy.equals(req.user._id)) {
        // Both users want to delete - delete the chat
        await Chat.findByIdAndDelete(req.params.chatId);
        return res.json({
          success: true,
          message: 'Chat deleted - both users agreed'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Delete request already pending'
        });
      }
    }

    // Create delete request
    chat.deleteRequestedBy = req.user._id;
    chat.deleteRequestStatus = 'pending';
    await chat.save();

    res.json({
      success: true,
      message: 'Delete request sent. Waiting for other user\'s approval.',
      data: chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error requesting chat deletion'
    });
  }
});

// @route   PUT /api/chats/:chatId/delete-approve
// @desc    Approve delete request (both users must approve)
// @access  Private
router.put('/:chatId/delete-approve', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is a participant and not the one who requested deletion
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!chat.deleteRequestedBy || chat.deleteRequestStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending delete request'
      });
    }

    if (chat.deleteRequestedBy.equals(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot approve your own delete request'
      });
    }

    // Both users have agreed - delete the chat
    await Chat.findByIdAndDelete(req.params.chatId);

    res.json({
      success: true,
      message: 'Chat deleted - both users agreed'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error approving delete request'
    });
  }
});

// @route   PUT /api/chats/:chatId/delete-decline
// @desc    Decline delete request
// @access  Private
router.put('/:chatId/delete-decline', protect, async (req, res) => {
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

    if (!chat.deleteRequestedBy || chat.deleteRequestStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending delete request'
      });
    }

    // Cancel the delete request
    chat.deleteRequestedBy = null;
    chat.deleteRequestStatus = null;
    await chat.save();

    res.json({
      success: true,
      message: 'Delete request declined',
      data: chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error declining delete request'
    });
  }
});

module.exports = router;

