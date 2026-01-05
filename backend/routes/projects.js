const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { checkAbusiveContent, analyzeContent } = require('../middleware/abusiveContentDetection');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Export a function that accepts io
module.exports = (io) => {

// Helper function to calculate reply depth (maximum depth of nested replies)
const getReplyDepth = (reply) => {
  if (!reply.replies || reply.replies.length === 0) {
    return 0;
  }
  let maxDepth = 0;
  for (const nestedReply of reply.replies) {
    const depth = getReplyDepth(nestedReply);
    maxDepth = Math.max(maxDepth, depth + 1);
  }
  return maxDepth;
};

// Helper function to calculate the level of a reply (how deep it is from the comment)
// Returns 1 for direct replies to comment, 2 for replies to replies, etc.
const getReplyLevel = (comment, replyId, currentLevel = 1) => {
  // Check direct replies to comment
  for (const reply of comment.replies || []) {
    if (reply._id.toString() === replyId.toString()) {
      return currentLevel;
    }
    // Recursively check nested replies
    if (reply.replies && reply.replies.length > 0) {
      const found = getReplyLevelInReplies(reply.replies, replyId, currentLevel + 1);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
};

// Helper to recursively find reply level in nested replies
const getReplyLevelInReplies = (replies, replyId, currentLevel) => {
  for (const reply of replies) {
    if (reply._id.toString() === replyId.toString()) {
      return currentLevel;
    }
    if (reply.replies && reply.replies.length > 0) {
      const found = getReplyLevelInReplies(reply.replies, replyId, currentLevel + 1);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
};

// Helper function to find and delete a nested reply recursively
const findAndDeleteReply = (replies, replyId, userId) => {
  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i];
    if (reply._id.toString() === replyId) {
      const replyUserId = reply.user?._id || reply.user;
      if (replyUserId?.toString() === userId?.toString() || replyUserId?.equals?.(userId)) {
        replies.splice(i, 1);
        return true;
      } else {
        return false; // Not authorized
      }
    }
    // Check nested replies
    if (reply.replies && reply.replies.length > 0) {
      const found = findAndDeleteReply(reply.replies, replyId, userId);
      if (found !== null) return found;
    }
  }
  return null; // Not found
};

// Helper function to find a reply by ID recursively
const findReplyById = (replies, replyId) => {
  for (const reply of replies) {
    if (reply._id.toString() === replyId) {
      return reply;
    }
    if (reply.replies && reply.replies.length > 0) {
      const found = findReplyById(reply.replies, replyId);
      if (found) return found;
    }
  }
  return null;
};

// @route   GET /api/projects/by-user/:userId
// @desc    Get projects a user created or joined
// @access  Private
router.get('/by-user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { 'participants.user': userId }
      ]
    })
      .populate('createdBy', 'name department')
      .populate('participants.user', 'name department')
      .select('title status domains skills createdAt createdBy participants isHidden');

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user projects'
    });
  }
});

// Helper function to check if project requirements are met
const checkAndAutoCompleteProject = async (project) => {
  // Check if there are required roles defined
  if (project.requiredRoles && project.requiredRoles.length > 0) {
    let allRolesFilled = true;

    for (const roleReq of project.requiredRoles) {
      const filledCount = project.participants.filter(
        p => p.role === roleReq.role
      ).length;

      if (filledCount < roleReq.count) {
        allRolesFilled = false;
        break;
      }
    }

    // If all roles are filled, automatically close the project
    if (allRolesFilled && project.status === 'open') {
      project.status = 'closed';
      await project.save();
      return true; // Project auto-completed
    }
  }

  return false; // Project not auto-completed
};

// @route   GET /api/projects
// @desc    Get all projects with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { domain, status, search, sort, skill } = req.query;
    let query = {};

    // Filter out hidden posts for non-admin users (also include posts without isHidden field for backward compatibility)
    query.isHidden = { $ne: true };

    if (domain) {
      query.domains = { $in: [domain] };
    }

    if (status) {
      query.status = status;
    } else {
      // If no specific status filter, exclude closed projects from trending/recent
      if (sort === 'trending' || sort === 'recent' || !sort) {
        query.status = { $ne: 'closed' };
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { domains: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } }
      ];
    }

    if (skill) {
      query.skills = { $in: [skill] };
    }

    let projects = await Project.find(query)
      .populate('createdBy', 'name department')
      .populate('comments.user', 'name')
      .populate('comments.replies.user', 'name')
      .populate('comments.replies.replies.user', 'name')
      .populate('comments.replies.replies.replies.user', 'name')
      .populate('participants.user', 'name')
      .populate('joinRequests.user', 'name email department');

    // Sort by trending (likes count) if requested
    if (sort === 'trending') {
      projects = projects.sort((a, b) => b.likes.length - a.likes.length);
      // Limit to top 3 trending projects
      projects = projects.slice(0, 3);
    } else {
      projects = projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching projects'
    });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private (Students and Faculty)
router.post('/', protect, authorize('student', 'faculty'), async (req, res) => {
  try {
    const { title, description, domains, skills, requiredRoles, teamRequirements, gitLink, department } = req.body;

    const project = await Project.create({
      title,
      description,
      domains,
      skills: skills || [],
      requiredRoles,
      teamRequirements,
      gitLink,
      department,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating project'
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project (owner only)
// @access  Private (Project Owner)
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is the owner
    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    const { title, description, domains, skills, requiredRoles, teamRequirements, gitLink, department } = req.body;

    // Update only provided fields
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (domains !== undefined) project.domains = domains;
    if (skills !== undefined) project.skills = skills;
    if (requiredRoles !== undefined) project.requiredRoles = requiredRoles;
    if (teamRequirements !== undefined) project.teamRequirements = teamRequirements;
    if (gitLink !== undefined) project.gitLink = gitLink;
    if (department !== undefined) project.department = department;

    await project.save();

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating project'
    });
  }
});

// @route   GET /api/projects/:id/team-chat
// @desc    Get team chat messages for a project
// @access  Private (Project Participants)
router.get('/:id/team-chat', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('teamChatMessages.user', 'name profilePicture')
      .populate('participants.user', 'name profilePicture');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is a participant or owner
    const isOwner = project.createdBy.toString() === req.user._id.toString();
    const isParticipant = project.participants.some(
      p => p.user._id.toString() === req.user._id.toString() || p.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Only project participants can access team chat'
      });
    }

    res.json({
      success: true,
      data: {
        messages: project.teamChatMessages || [],
        participants: project.participants || []
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching team chat'
    });
  }
});

// @route   POST /api/projects/:id/team-chat
// @desc    Send a message to project team chat
// @access  Private (Project Participants)
router.post('/:id/team-chat', protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const project = await Project.findById(req.params.id)
      .populate('participants.user', 'name profilePicture');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is a participant or owner
    const isOwner = project.createdBy.toString() === req.user._id.toString();
    const isParticipant = project.participants.some(
      p => p.user._id.toString() === req.user._id.toString() || p.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Only project participants can send messages'
      });
    }

    // Add message to team chat
    project.teamChatMessages.push({
      user: req.user._id,
      content: content.trim()
    });

    await project.save();
    await project.populate('teamChatMessages.user', 'name profilePicture');

    const newMessage = project.teamChatMessages[project.teamChatMessages.length - 1];

    // Emit socket event to all users in the project chat room
    if (io) {
      io.to(`project-${req.params.id}`).emit('new-project-chat-message', {
        projectId: req.params.id,
        message: newMessage
      });
    }

    res.json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error sending message'
    });
  }
});

// @route   DELETE /api/projects/:id/team-chat/participant/:participantId
// @desc    Remove a participant from project (owner only)
// @access  Private (Project Owner)
router.delete('/:id/team-chat/participant/:participantId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is the owner
    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can remove participants'
      });
    }

    // Remove participant
    project.participants = project.participants.filter(
      p => p.user.toString() !== req.params.participantId && p._id.toString() !== req.params.participantId
    );

    await project.save();
    await project.populate('participants.user', 'name profilePicture');

    res.json({
      success: true,
      message: 'Participant removed successfully',
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error removing participant'
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name department email')
      .populate('comments.user', 'name profilePicture')
      .populate('comments.replies.user', 'name profilePicture')
      .populate('comments.replies.replies.user', 'name profilePicture')
      .populate('comments.replies.replies.replies.user', 'name profilePicture')
      .populate('participants.user', 'name department')
      .populate('joinRequests.user', 'name email department');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if project is hidden and user is not admin
    if (project.isHidden) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error fetching project'
    });
  }
});

// @route   POST /api/projects/:id/like
// @desc    Like/Unlike a project
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot like a completed project'
      });
    }

    const likeIndex = project.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike
      project.likes.splice(likeIndex, 1);
    } else {
      // Like
      project.likes.push(req.user._id);
    }

    await project.save();

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error liking project'
    });
  }
});

// @route   POST /api/projects/:id/comment/:commentId/vote
// @desc    Vote on a comment (upvote or downvote)
// @access  Private
router.post('/:id/comment/:commentId/vote', protect, async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote' or 'downvote'
    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid voteType. Must be "upvote" or "downvote"'
      });
    }
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const comment = project.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const userId = req.user._id;
    // Handle both ObjectId and string comparisons
    const hasUpvoted = comment.upvotes?.some(id => 
      id?.toString() === userId?.toString() || id?.equals?.(userId)
    ) || false;
    const hasDownvoted = comment.downvotes?.some(id => 
      id?.toString() === userId?.toString() || id?.equals?.(userId)
    ) || false;

    // Initialize arrays if they don't exist
    if (!comment.upvotes) comment.upvotes = [];
    if (!comment.downvotes) comment.downvotes = [];

    // Remove existing votes
    comment.upvotes = comment.upvotes.filter(id => 
      !(id?.toString() === userId?.toString() || id?.equals?.(userId))
    );
    comment.downvotes = comment.downvotes.filter(id => 
      !(id?.toString() === userId?.toString() || id?.equals?.(userId))
    );

    // Add new vote if different from current
    if (voteType === 'upvote' && !hasUpvoted) {
      comment.upvotes.push(userId);
    } else if (voteType === 'downvote' && !hasDownvoted) {
      comment.downvotes.push(userId);
    }

    await project.save();
    await project.populate('comments.user', 'name');
    await project.populate('comments.replies.user', 'name');
    await project.populate('comments.replies.replies.user', 'name');
    await project.populate('comments.replies.replies.replies.user', 'name');

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error voting on comment'
    });
  }
});

// Helper function to recursively find a reply
const findReplyRecursiveForVote = (repliesArray, replyId) => {
  for (const reply of repliesArray || []) {
    if (reply._id.toString() === replyId.toString()) {
      return reply;
    }
    // Recursively check nested replies
    if (reply.replies && reply.replies.length > 0) {
      const found = findReplyRecursiveForVote(reply.replies, replyId);
      if (found) return found;
    }
  }
  return null;
};

// @route   POST /api/projects/:id/comment/:commentId/reply/:replyId/vote
// @desc    Vote on a reply (upvote or downvote)
// @access  Private
router.post('/:id/comment/:commentId/reply/:replyId/vote', protect, async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote' or 'downvote'
    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid voteType. Must be "upvote" or "downvote"'
      });
    }
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const comment = project.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Recursively find the reply at any nesting level
    const reply = findReplyRecursiveForVote(comment.replies, req.params.replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }

    const userId = req.user._id;
    // Handle both ObjectId and string comparisons
    const hasUpvoted = reply.upvotes?.some(id => 
      id?.toString() === userId?.toString() || id?.equals?.(userId)
    ) || false;
    const hasDownvoted = reply.downvotes?.some(id => 
      id?.toString() === userId?.toString() || id?.equals?.(userId)
    ) || false;

    // Initialize arrays if they don't exist
    if (!reply.upvotes) reply.upvotes = [];
    if (!reply.downvotes) reply.downvotes = [];

    // Remove existing votes
    reply.upvotes = reply.upvotes.filter(id => 
      !(id?.toString() === userId?.toString() || id?.equals?.(userId))
    );
    reply.downvotes = reply.downvotes.filter(id => 
      !(id?.toString() === userId?.toString() || id?.equals?.(userId))
    );

    // Add new vote if different from current
    if (voteType === 'upvote' && !hasUpvoted) {
      reply.upvotes.push(userId);
    } else if (voteType === 'downvote' && !hasDownvoted) {
      reply.downvotes.push(userId);
    }

    await project.save();
    await project.populate('comments.user', 'name profilePicture');
    await project.populate('comments.replies.user', 'name profilePicture');
    await project.populate('comments.replies.replies.user', 'name profilePicture');
    await project.populate('comments.replies.replies.replies.user', 'name profilePicture');

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error voting on reply'
    });
  }
});

// @route   DELETE /api/projects/:id/comment/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/:id/comment/:commentId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const comment = project.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if the user is the owner of the comment
    const userId = req.user._id;
    const commentUserId = comment.user?._id || comment.user;
    
    if (commentUserId?.toString() !== userId?.toString() && !commentUserId?.equals?.(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments'
      });
    }

    // Remove the comment from the array
    project.comments.pull(req.params.commentId);
    await project.save();
    await project.populate('comments.user', 'name');
    await project.populate('comments.replies.user', 'name');
    await project.populate('comments.replies.replies.user', 'name');
    await project.populate('comments.replies.replies.replies.user', 'name');

    res.json({
      success: true,
      data: project,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting comment'
    });
  }
});

// Helper function to recursively find and remove a reply
const removeReplyRecursive = (repliesArray, replyId) => {
  for (let i = 0; i < repliesArray.length; i++) {
    const reply = repliesArray[i];
    if (reply._id.toString() === replyId.toString()) {
      repliesArray.splice(i, 1);
      return true;
    }
    // Recursively check nested replies
    if (reply.replies && reply.replies.length > 0) {
      if (removeReplyRecursive(reply.replies, replyId)) {
        return true;
      }
    }
  }
  return false;
};

// Helper function to recursively find a reply
const findReplyRecursive = (repliesArray, replyId) => {
  for (const reply of repliesArray || []) {
    if (reply._id.toString() === replyId.toString()) {
      return reply;
    }
    // Recursively check nested replies
    if (reply.replies && reply.replies.length > 0) {
      const found = findReplyRecursive(reply.replies, replyId);
      if (found) return found;
    }
  }
  return null;
};

// @route   DELETE /api/projects/:id/comment/:commentId/reply/:replyId
// @desc    Delete a reply
// @access  Private
router.delete('/:id/comment/:commentId/reply/:replyId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const comment = project.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Recursively find the reply at any nesting level
    const reply = findReplyRecursive(comment.replies, req.params.replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }

    // Check if the user is the owner of the reply
    const userId = req.user._id;
    const replyUserId = reply.user?._id || reply.user;
    
    if (replyUserId?.toString() !== userId?.toString() && !replyUserId?.equals?.(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own replies'
      });
    }

    // Recursively remove the reply from the array
    const removed = removeReplyRecursive(comment.replies, req.params.replyId);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }

    await project.save();
    await project.populate('comments.user', 'name');
    await project.populate('comments.replies.user', 'name');
    await project.populate('comments.replies.replies.user', 'name');
    await project.populate('comments.replies.replies.replies.user', 'name');

    res.json({
      success: true,
      data: project,
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting reply'
    });
  }
});

// @route   POST /api/projects/:id/comment/:commentId/reply
// @desc    Add a reply to a comment
// @access  Private
router.post('/:id/comment/:commentId/reply', protect, checkAbusiveContent, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.status === 'closed') {
      return res.status(403).json({
        success: false,
        message: 'Cannot reply to comments on a completed project'
      });
    }

    if (project.commentsDisabled) {
      return res.status(403).json({
        success: false,
        message: 'Comments are disabled for this project'
      });
    }

    const comment = project.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if replying to a reply (nested reply)
    const { parentReplyId } = req.body;
    
    if (parentReplyId) {
      // Find the parent reply recursively
      const parentReply = findReplyById(comment.replies, parentReplyId);
      if (!parentReply) {
        return res.status(404).json({
          success: false,
          message: 'Parent reply not found'
        });
      }
      
      // Check the level of the parent reply
      // Level 1 = direct reply to comment
      // Level 2 = reply to a reply (level 1)
      // Level 3 = reply to a reply (level 2) - MAX ALLOWED
      // Level 4 = not allowed
      const parentLevel = getReplyLevel(comment, parentReplyId);
      
      if (parentLevel === null) {
        return res.status(404).json({
          success: false,
          message: 'Could not determine parent reply level'
        });
      }
      
      // If parent is at level 3, we can't add another reply (would be level 4)
      if (parentLevel >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Maximum nesting depth (3 levels) reached'
        });
      }
      
      // Initialize replies array if it doesn't exist
      if (!parentReply.replies) parentReply.replies = [];
      
      parentReply.replies.push({
        user: req.user._id,
        text: req.body.text,
        upvotes: [],
        downvotes: []
      });
    } else {
      // Direct reply to comment - UNLIMITED (no depth check)
    comment.replies.push({
      user: req.user._id,
        text: req.body.text,
        upvotes: [],
        downvotes: []
    });
    }

    await project.save();
    await project.populate('comments.user', 'name profilePicture');
    await project.populate('comments.replies.user', 'name profilePicture');
    await project.populate('comments.replies.replies.user', 'name profilePicture');
    await project.populate('comments.replies.replies.replies.user', 'name profilePicture');

    // Create notification for comment/reply owner
    try {
      let targetUserId;
      let replyId;
      
      if (parentReplyId) {
        // Find the parent reply to get its user
        const parentReply = findReplyById(comment.replies, parentReplyId);
        if (parentReply) {
          targetUserId = parentReply.user;
          replyId = parentReplyId;
        }
      } else {
        // Direct reply to comment
        targetUserId = comment.user;
        replyId = null;
      }

      // Don't notify if replying to own comment/reply
      if (targetUserId && targetUserId.toString() !== req.user._id.toString()) {
        const replyUser = await User.findById(req.user._id);
        const replyText = req.body.text.substring(0, 100); // Truncate for notification
        
        await Notification.create({
          user: targetUserId,
          type: 'comment_reply',
          title: 'New Reply to Your Comment',
          message: `${replyUser.name} replied to your comment: "${replyText}${req.body.text.length > 100 ? '...' : ''}"`,
          projectId: project._id,
          commentId: req.params.commentId,
          replyId: replyId
        });
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the request if notification creation fails
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error adding reply'
    });
  }
});

// @route   POST /api/projects/:id/comment/:commentId/vote
// @desc    Vote on a comment (upvote or downvote)
// @access  Private
router.post('/:id/comment/:commentId/vote', protect, async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote' or 'downvote'
    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid voteType. Must be "upvote" or "downvote"'
      });
    }
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    const comment = project.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    const userId = req.user._id;
    // Handle both ObjectId and string comparisons
    const hasUpvoted = comment.upvotes?.some(id => 
      id?.toString() === userId?.toString() || id?.equals?.(userId)
    ) || false;
    const hasDownvoted = comment.downvotes?.some(id => 
      id?.toString() === userId?.toString() || id?.equals?.(userId)
    ) || false;
    // Initialize arrays if they don't exist
    if (!comment.upvotes) comment.upvotes = [];
    if (!comment.downvotes) comment.downvotes = [];
    // Remove existing votes
    comment.upvotes = comment.upvotes.filter(id => 
      !(id?.toString() === userId?.toString() || id?.equals?.(userId))
    );
    comment.downvotes = comment.downvotes.filter(id => 
      !(id?.toString() === userId?.toString() || id?.equals?.(userId))
    );
    // Add new vote if different from current
    if (voteType === 'upvote' && !hasUpvoted) {
      comment.upvotes.push(userId);
    } else if (voteType === 'downvote' && !hasDownvoted) {
      comment.downvotes.push(userId);
    }
    await project.save();
    await project.populate('comments.user', 'name');
    await project.populate('comments.replies.user', 'name');
    await project.populate('comments.replies.replies.user', 'name');
    await project.populate('comments.replies.replies.replies.user', 'name');
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error voting on comment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error voting on comment'
    });
  }
});

// @route   POST /api/projects/:id/comment/:commentId/reply/:replyId/vote
// @desc    Vote on a reply (upvote or downvote) - DUPLICATE ROUTE (should be removed)
// @access  Private
router.post('/:id/comment/:commentId/reply/:replyId/vote', protect, async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote' or 'downvote'
    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid voteType. Must be "upvote" or "downvote"'
      });
    }
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    const comment = project.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    // Recursively find the reply at any nesting level
    const reply = findReplyRecursiveForVote(comment.replies, req.params.replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }
    const userId = req.user._id;
    // Handle both ObjectId and string comparisons
    const hasUpvoted = reply.upvotes?.some(id => 
      id?.toString() === userId?.toString() || id?.equals?.(userId)
    ) || false;
    const hasDownvoted = reply.downvotes?.some(id => 
      id?.toString() === userId?.toString() || id?.equals?.(userId)
    ) || false;
    // Initialize arrays if they don't exist
    if (!reply.upvotes) reply.upvotes = [];
    if (!reply.downvotes) reply.downvotes = [];
    // Remove existing votes
    reply.upvotes = reply.upvotes.filter(id => 
      !(id?.toString() === userId?.toString() || id?.equals?.(userId))
    );
    reply.downvotes = reply.downvotes.filter(id => 
      !(id?.toString() === userId?.toString() || id?.equals?.(userId))
    );
    // Add new vote if different from current
    if (voteType === 'upvote' && !hasUpvoted) {
      reply.upvotes.push(userId);
    } else if (voteType === 'downvote' && !hasDownvoted) {
      reply.downvotes.push(userId);
    }
    await project.save();
    await project.populate('comments.user', 'name');
    await project.populate('comments.replies.user', 'name');
    await project.populate('comments.replies.replies.user', 'name');
    await project.populate('comments.replies.replies.replies.user', 'name');
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error voting on reply:', error);
    res.status(500).json({
      success: false,
      message: 'Server error voting on reply'
    });
  }
});

// @route   POST /api/projects/:id/comment
// @desc    Add a comment to a project
// @access  Private
router.post('/:id/comment', protect, checkAbusiveContent, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.status === 'closed') {
      return res.status(403).json({
        success: false,
        message: 'Cannot comment on a completed project'
      });
    }

    if (project.commentsDisabled) {
      return res.status(403).json({
        success: false,
        message: 'Comments are disabled for this project'
      });
    }

    project.comments.push({
      user: req.user._id,
      text: req.body.text,
      upvotes: [],
      downvotes: []
    });

    await project.save();
    await project.populate('comments.user', 'name');
    await project.populate('comments.replies.user', 'name');
    await project.populate('comments.replies.replies.user', 'name');
    await project.populate('comments.replies.replies.replies.user', 'name');

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error adding comment'
    });
  }
});

// @route   POST /api/projects/:id/join
// @desc    Request to join a project (creates pending request)
// @access  Private (Students and Faculty)
router.post('/:id/join', protect, authorize('student', 'faculty'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This project is closed'
      });
    }

    // Check if user already joined
    const alreadyJoined = project.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this project'
      });
    }

    // Check if user already has a pending request
    const existingRequest = project.joinRequests.find(
      r => r.user.toString() === req.user._id.toString() && r.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this project'
      });
    }

    // Create join request
    const newRequest = {
      user: req.user._id,
      role: req.body.role || 'Member',
      status: 'pending'
    };
    project.joinRequests.push(newRequest);

    await project.save();
    await project.populate('joinRequests.user', 'name email department');
    await project.populate('createdBy', 'name');

    // Get the newly created request
    const savedRequest = project.joinRequests[project.joinRequests.length - 1];

    // Create notification for project owner
    if (project.createdBy && project.createdBy._id.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        user: project.createdBy._id,
        type: 'project_join_request',
        title: 'New Join Request',
        message: `${req.user.name} wants to join your project "${project.title}"`,
        projectId: project._id
      });
      await notification.save();

      // Emit socket event to notify the project owner
      io.to(`user-${project.createdBy._id.toString()}`).emit('new-notification', {
        type: 'project_join_request',
        title: 'New Join Request',
        message: `${req.user.name} wants to join your project "${project.title}"`,
        projectId: project._id.toString(),
        requestId: savedRequest._id.toString()
      });
    }

    res.json({
      success: true,
      message: 'Join request sent! Waiting for owner approval.',
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error sending join request'
    });
  }
});

// @route   DELETE /api/projects/:id/join-request/:requestId
// @desc    Cancel/withdraw a join request (user can cancel their own pending request)
// @access  Private (Request Owner)
router.delete('/:id/join-request/:requestId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const request = project.joinRequests.id(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    // Check if the request belongs to the current user
    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a request that has already been processed'
      });
    }

    // Remove the request
    project.joinRequests = project.joinRequests.filter(
      r => r._id.toString() !== req.params.requestId
    );

    await project.save();
    await project.populate('joinRequests.user', 'name email department');

    res.json({
      success: true,
      message: 'Join request cancelled successfully',
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling request'
    });
  }
});

// @route   POST /api/projects/:id/approve-request/:requestId
// @desc    Approve a join request
// @access  Private (Project Owner)
router.post('/:id/approve-request/:requestId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve requests for this project'
      });
    }

    const request = project.joinRequests.id(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Add user to participants
    project.participants.push({
      user: request.user,
      role: request.role,
      joinedAt: Date.now()
    });

    // Update request status
    request.status = 'approved';

    await project.save();

    // Check if requirements are met and auto-complete if needed
    const autoCompleted = await checkAndAutoCompleteProject(project);

    await project.populate('participants.user', 'name');
    await project.populate('joinRequests.user', 'name email department');

    res.json({
      success: true,
      message: autoCompleted
        ? 'Join request approved! Project requirements met - marked as complete.'
        : 'Join request approved!',
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error approving request'
    });
  }
});

// @route   POST /api/projects/:id/reject-request/:requestId
// @desc    Reject a join request
// @access  Private (Project Owner)
router.post('/:id/reject-request/:requestId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject requests for this project'
      });
    }

    const request = project.joinRequests.id(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Update request status
    request.status = 'rejected';

    await project.save();
    await project.populate('joinRequests.user', 'name email department');

    res.json({
      success: true,
      message: 'Join request rejected',
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting request'
    });
  }
});

// @route   PUT /api/projects/:id/close
// @desc    Close a project
// @access  Private (Project Owner)
router.put('/:id/close', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this project'
      });
    }

    project.status = 'closed';
    await project.save();

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error closing project'
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private (Project Owner)
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project'
      });
    }

    await project.deleteOne();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting project'
    });
  }
});

// Initialize Google Gemini AI
const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

// Helper function to list available models
const listAvailableModels = async () => {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return [];
  }
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GOOGLE_GEMINI_API_KEY}`
    );
    const models = response.data.models || [];
    console.log('Available models:', models.map(m => m.name).join(', '));
    return models.map(m => m.name);
  } catch (error) {
    console.error('Error listing models:', error.message);
    return [];
  }
};

// Helper function to summarize text using Google Gemini SDK
const summarizeWithGemini = async (text) => {
  if (!genAI) {
    throw new Error('Google Gemini API key is not configured');
  }

  if (!text || text.trim().length === 0) {
    return 'No description available.';
  }

  const prompt = `Please provide a concise and clear summary of the following project description in 2-3 sentences (maximum 150 words). Focus on the main purpose, key features, and objectives. Make it easy to understand:

${text}

Summary:`;

  // First, try to get available models and use one that supports generateContent
  let availableModels = [];
  try {
    availableModels = await listAvailableModels();
  } catch (error) {
    console.log('Could not list available models, using default list');
  }

  // Extract model names (remove the "models/" prefix if present)
  const modelNamesToTry = availableModels.length > 0 
    ? availableModels
        .map(name => name.replace('models/', ''))
        .filter(name => name.includes('gemini'))
    : [
    'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'models/gemini-1.5-flash',
        'models/gemini-pro'
  ];

  let lastError = null;

  // Try each model using SDK
  for (const modelName of modelNamesToTry) {
    try {
      console.log(`Attempting to use model: ${modelName}`);

      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text().trim();

      // Return the full summary - the prompt already asks for a concise 2-3 sentence summary
      // Only truncate if it's extremely long (over 1000 characters) as a safety measure
      if (summary.length > 1000) {
        // Find a good breaking point near the 1000 character mark
        const breakPoint = summary.lastIndexOf('.', 950) ||
          summary.lastIndexOf('!', 950) ||
          summary.lastIndexOf('?', 950) ||
          summary.lastIndexOf(' ', 950);
        if (breakPoint > 500) {
            return summary.substring(0, breakPoint + 1).trim();
          }
        return summary.substring(0, 997).trim() + '...';
        }

        console.log(`Successfully used model: ${modelName}`);
        return summary;
    } catch (error) {
      console.error(`Model ${modelName} failed:`, error.message);
      lastError = error;
      // Continue to next model
      continue;
    }
  }

  // If all models failed, throw error with helpful message
  console.error('All Gemini models failed. Last error:', lastError);
  const errorMessage = lastError?.message || 'Unknown error';
  throw new Error(`Failed to generate summary. Please check your Google Gemini API key and model availability. Error: ${errorMessage}. Available models: ${availableModels.join(', ') || 'none found'}`);
};

// @route   POST /api/projects/:id/summarize
// @desc    Get AI-generated summary of project description using Google Gemini
// @access  Public
router.post('/:id/summarize', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if project is hidden
    if (project.isHidden) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.description || project.description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project description is empty'
      });
    }

    // Check if Gemini API is configured
    if (!genAI) {
      return res.status(503).json({
        success: false,
        message: 'AI summarization service is not available. Please configure Google Gemini API key.'
      });
    }

    // Generate summary using Gemini
    const summary = await summarizeWithGemini(project.description);

    res.json({
      success: true,
      data: {
        summary,
        originalLength: project.description.length,
        summaryLength: summary.length
      }
    });
  } catch (error) {
    console.error('Summarization Error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Server error generating summary'
    });
  }
});

  return router;
};

