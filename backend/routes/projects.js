const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');
const { checkAbusiveContent, analyzeContent } = require('../middleware/abusiveContentDetection');

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

// @route   GET /api/projects/:id
// @desc    Get single project by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name department email')
      .populate('comments.user', 'name profilePicture')
      .populate('comments.replies.user', 'name profilePicture')
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

    comment.replies.push({
      user: req.user._id,
      text: req.body.text
    });

    await project.save();
    await project.populate('comments.user', 'name');
    await project.populate('comments.replies.user', 'name');

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
      text: req.body.text
    });

    await project.save();
    await project.populate('comments.user', 'name');

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
    project.joinRequests.push({
      user: req.user._id,
      role: req.body.role || 'Member',
      status: 'pending'
    });

    await project.save();
    await project.populate('joinRequests.user', 'name email department');

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

module.exports = router;

