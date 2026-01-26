const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Report = require('../models/Report');
const Project = require('../models/Project');
const Internship = require('../models/Internship');
const Hackathon = require('../models/Hackathon');
const Drive = require('../models/Drive');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin)
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalFaculty = await User.countDocuments({ role: 'faculty' });
    const suspendedUsers = await User.countDocuments({ isSuspended: true });

    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: 'open' });
    const totalInternships = await Internship.countDocuments();
    const totalHackathons = await Hackathon.countDocuments();
    const totalDrives = await Drive.countDocuments();

    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const totalReports = await Report.countDocuments();

    // Get trending projects
    const trendingProjects = await Project.find()
      .sort({ likes: -1 })
      .limit(5)
      .populate('createdBy', 'name department');

    // Get recent reports
    const recentReports = await Report.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('reportedUser', 'name email role');

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          students: totalStudents,
          faculty: totalFaculty,
          suspended: suspendedUsers
        },
        content: {
          projects: totalProjects,
          activeProjects: activeProjects,
          internships: totalInternships,
          hackathons: totalHackathons,
          drives: totalDrives
        },
        reports: {
          pending: pendingReports,
          total: totalReports
        },
        trendingProjects,
        recentReports
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, search, status } = req.query;
    let query = {};

    if (role) {
      query.role = role;
    }

    if (status === 'suspended') {
      query.isSuspended = true;
    } else if (status === 'active') {
      query.isSuspended = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// @route   PUT /api/admin/users/:id/suspend
// @desc    Suspend/Unsuspend a user
// @access  Private (Admin)
router.put('/users/:id/suspend', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend admin users'
      });
    }

    user.isSuspended = !user.isSuspended;
    user.suspensionReason = req.body.reason || '';

    await user.save();

    // Create notification
    const Notification = require('../models/Notification');

    if (user.isSuspended) {
      await Notification.create({
        user: user._id,
        type: 'account_suspended',
        title: 'Account Suspended',
        message: 'Your account has been suspended due to policy violations. To activate your account, please contact our support team at campuscollabofficial@gmail.com.',
        isRead: false
      });
    } else {
      await Notification.create({
        user: user._id,
        type: 'account_unsuspended',
        title: 'Account Reactivated',
        message: 'Your account has been reactivated. You can now access all features.',
        isRead: false
      });
    }

    res.json({
      success: true,
      message: `User ${user.isSuspended ? 'suspended' : 'unsuspended'} successfully`,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error suspending user'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private (Admin)
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});

// @route   GET /api/admin/reports
// @desc    Get all reports
// @access  Private (Admin)
router.get('/reports', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (type) {
      query.reportType = type;
    }

    const reports = await Report.find(query)
      .populate('reportedUser', 'name email role')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reports'
    });
  }
});

// @route   PUT /api/admin/reports/:id/review
// @desc    Review a report and take action
// @access  Private (Admin)
router.put('/reports/:id/review', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const { status, actionTaken } = req.body;

    report.status = status;
    report.actionTaken = actionTaken;
    report.reviewedBy = req.user._id;
    report.reviewedAt = Date.now();

    await report.save();

    res.json({
      success: true,
      message: 'Report reviewed successfully',
      data: report
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error reviewing report'
    });
  }
});

// @route   PUT /api/admin/reports/:id/warn
// @desc    Warn the reported user
// @access  Private (Admin)
router.put('/reports/:id/warn', protect, authorize('admin'), async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Determine the warning message
    const warningMessage = `You have been warned for posting abusive content. Repeated violations will result in account suspension. Content: "${report.content.substring(0, 50)}${report.content.length > 50 ? '...' : ''}"`;

    // Create notification for the user
    await Notification.create({
      user: report.reportedUser,
      type: 'content_warning',
      title: 'Content Warning',
      message: warningMessage,
      isRead: false
    });

    // Update report status
    report.status = 'action-taken';
    report.actionTaken = 'User Warned';
    report.reviewedBy = req.user._id;
    report.reviewedAt = Date.now();

    await report.save();

    res.json({
      success: true,
      message: 'User warned successfully',
      data: report
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error warning user'
    });
  }
});

// @route   PUT /api/admin/reports/:id/accept
// @desc    Accept/Approve flagged content (restore it)
// @access  Private (Admin)
router.put('/reports/:id/accept', protect, authorize('admin'), async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    let restoredCommentId = null;

    // 1. Restore content based on type
    if (report.contentType === 'project' || report.contentType === 'general') { // 'general' logic usually maps to project comments in this app
      const project = await Project.findById(report.contentId);

      if (project) {
        // Add the comment to the project with original timestamp
        project.comments.push({
          user: report.reportedUser,
          text: report.content,
          createdAt: report.createdAt || Date.now(), // Use report creation time as original comment time
          isAbusive: false // Explicitly mark as safe now
        });

        await project.save();
      } else {
        return res.status(404).json({
          success: false,
          message: 'Target project not found, cannot restore content'
        });
      }
    } else {
      // Handle other content types if necessary (e.g. internships)
      // For now, only Project comments are fully implemented with abusive detection middleware
    }

    // 2. Notify the user
    await Notification.create({
      user: report.reportedUser,
      type: 'content_approved',
      title: 'Content Approved',
      message: `Your comment "${report.content.substring(0, 30)}..." has been reviewed and approved by admins. Click to view.`,
      projectId: report.contentId,
      commentId: restoredCommentId,
      isRead: false
    });

    // 3. Update Report Status
    report.status = 'action-taken';
    report.actionTaken = 'Content Approved/Restored';
    report.reviewedBy = req.user._id;
    report.reviewedAt = Date.now();

    await report.save();

    res.json({
      success: true,
      message: 'Content accepted and restored successfully',
      data: report
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error accepting content'
    });
  }
});

// @route   DELETE /api/admin/projects/:id
// @desc    Delete any project (admin override)
// @access  Private (Admin)
router.delete('/projects/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
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

// @route   DELETE /api/admin/internships/:id
// @desc    Delete any internship
// @access  Private (Admin)
router.delete('/internships/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const Internship = require('../models/Internship');
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
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

// @route   DELETE /api/admin/hackathons/:id
// @desc    Delete any hackathon
// @access  Private (Admin)
router.delete('/hackathons/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const Hackathon = require('../models/Hackathon');
    const hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
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

// @route   DELETE /api/admin/drives/:id
// @desc    Delete any drive
// @access  Private (Admin)
router.delete('/drives/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const Drive = require('../models/Drive');
    const drive = await Drive.findById(req.params.id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
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

// @route   DELETE /api/admin/course-links/:id
// @desc    Delete any course link
// @access  Private (Admin)
router.delete('/course-links/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const CourseLink = require('../models/CourseLink');
    const courseLink = await CourseLink.findById(req.params.id);

    if (!courseLink) {
      return res.status(404).json({
        success: false,
        message: 'Course link not found'
      });
    }

    await courseLink.deleteOne();

    res.json({
      success: true,
      message: 'Course link deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting course link'
    });
  }
});

// @route   GET /api/admin/content/projects
// @desc    Get all projects (including hidden) for admin
// @access  Private (Admin)
router.get('/content/projects', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) {
      if (status === 'completed') {
        query.status = 'closed';
      } else {
        query.status = 'open';
      }
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'name department')
      .sort({ createdAt: -1 });

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

// @route   GET /api/admin/content/internships
// @desc    Get all internships (including hidden) for admin
// @access  Private (Admin)
router.get('/content/internships', protect, authorize('admin'), async (req, res) => {
  try {
    const internships = await Internship.find({})
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

// @route   GET /api/admin/content/hackathons
// @desc    Get all hackathons (including hidden) for admin
// @access  Private (Admin)
router.get('/content/hackathons', protect, authorize('admin'), async (req, res) => {
  try {
    const hackathons = await Hackathon.find({})
      .populate('postedBy', 'name department')
      .sort({ createdAt: -1 });

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

// @route   GET /api/admin/content/drives
// @desc    Get all drives (including hidden) for admin
// @access  Private (Admin)
router.get('/content/drives', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status === 'completed') {
      query.driveDate = { $lt: new Date() };
    } else if (status === 'active') {
      query.driveDate = { $gte: new Date() };
    }

    const drives = await Drive.find(query)
      .populate('postedBy', 'name department')
      .sort({ driveDate: status === 'completed' ? -1 : 1 });

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

// @route   GET /api/admin/content/course-links
// @desc    Get all course links (including hidden) for admin
// @access  Private (Admin)
router.get('/content/course-links', protect, authorize('admin'), async (req, res) => {
  try {
    const CourseLink = require('../models/CourseLink');
    const courseLinks = await CourseLink.find({})
      .populate('postedBy', 'name department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courseLinks.length,
      data: courseLinks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course links'
    });
  }
});

// @route   PUT /api/admin/projects/:id/disable-comments
// @desc    Disable/Enable comments on a project
// @access  Private (Admin)
router.put('/projects/:id/disable-comments', protect, authorize('admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.commentsDisabled = !project.commentsDisabled;
    await project.save();

    res.json({
      success: true,
      message: `Comments ${project.commentsDisabled ? 'disabled' : 'enabled'} successfully`,
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

// @route   PUT /api/admin/projects/:id/hide
// @desc    Hide/Unhide a project
// @access  Private (Admin)
router.put('/projects/:id/hide', protect, authorize('admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.isHidden = !project.isHidden;
    await project.save();

    res.json({
      success: true,
      message: `Project ${project.isHidden ? 'hidden' : 'unhidden'} successfully`,
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

// @route   PUT /api/admin/internships/:id/hide
// @desc    Hide/Unhide an internship
// @access  Private (Admin)
router.put('/internships/:id/hide', protect, authorize('admin'), async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    internship.isHidden = !internship.isHidden;
    await internship.save();

    res.json({
      success: true,
      message: `Internship ${internship.isHidden ? 'hidden' : 'unhidden'} successfully`,
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

// @route   PUT /api/admin/hackathons/:id/hide
// @desc    Hide/Unhide a hackathon
// @access  Private (Admin)
router.put('/hackathons/:id/hide', protect, authorize('admin'), async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }

    hackathon.isHidden = !hackathon.isHidden;
    await hackathon.save();

    res.json({
      success: true,
      message: `Hackathon ${hackathon.isHidden ? 'hidden' : 'unhidden'} successfully`,
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

// @route   PUT /api/admin/drives/:id/hide
// @desc    Hide/Unhide a drive
// @access  Private (Admin)
router.put('/drives/:id/hide', protect, authorize('admin'), async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    drive.isHidden = !drive.isHidden;
    await drive.save();

    res.json({
      success: true,
      message: `Drive ${drive.isHidden ? 'hidden' : 'unhidden'} successfully`,
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

// @route   PUT /api/admin/course-links/:id/hide
// @desc    Hide/Unhide a course link
// @access  Private (Admin)
router.put('/course-links/:id/hide', protect, authorize('admin'), async (req, res) => {
  try {
    const CourseLink = require('../models/CourseLink');
    const courseLink = await CourseLink.findById(req.params.id);

    if (!courseLink) {
      return res.status(404).json({
        success: false,
        message: 'Course link not found'
      });
    }

    courseLink.isHidden = !courseLink.isHidden;
    await courseLink.save();

    res.json({
      success: true,
      message: `Course link ${courseLink.isHidden ? 'hidden' : 'unhidden'} successfully`,
      data: courseLink
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating course link'
    });
  }
});

module.exports = router;

