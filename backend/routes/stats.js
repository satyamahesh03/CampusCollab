const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Internship = require('../models/Internship');
const Hackathon = require('../models/Hackathon');
const Drive = require('../models/Drive');
const CourseLink = require('../models/CourseLink');

// Helper function to get start of day
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper function to get start of week (Monday)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper function to format date for labels
const formatDateLabel = (date, period) => {
  const d = new Date(date);
  if (period === 'week') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[d.getDay()];
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    return `${dayName} ${day}`;
  } else {
    // For month view, return week labels (Week 1, Week 2, etc.)
    // This will be calculated in the interval loop
    return '';
  }
};

// @route   GET /api/stats/public
// @desc    Get public statistics (users count and posted data statistics with breakdown)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const { period } = req.query; // 'week' or 'month'
    
    // Get total users count
    const totalUsers = await User.countDocuments({ isSuspended: { $ne: true } });
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    let intervals = [];
    
    if (period === 'week') {
      // Week: last 7 days including today
      startDate = getStartOfDay(new Date(now));
      startDate.setDate(startDate.getDate() - 6);
      
      // Create day-wise intervals (last 7 days)
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dayStart = getStartOfDay(date);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        intervals.push({
          date: date.toISOString(),
          label: formatDateLabel(date, 'week'),
          start: dayStart,
          end: dayEnd
        });
      }
    } else {
      // Month: last 4 weeks including current week
      const currentWeekStart = getStartOfWeek(now);
      startDate = new Date(currentWeekStart);
      startDate.setDate(startDate.getDate() - (3 * 7));
      
      // Create week-wise intervals
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        intervals.push({
          date: weekStart.toISOString(),
          label: formatDateLabel(weekStart, 'month'),
          start: weekStart,
          end: weekEnd
        });
      }
    }
    
    // Fetch all posts in the period for breakdown
    const allProjects = await Project.find({ 
      createdAt: { $gte: startDate },
      isHidden: { $ne: true }
    }).select('createdAt');
    
    const allInternships = await Internship.find({ 
      createdAt: { $gte: startDate },
      isHidden: { $ne: true }
    }).select('createdAt');
    
    const allHackathons = await Hackathon.find({ 
      createdAt: { $gte: startDate },
      isHidden: { $ne: true }
    }).select('createdAt');
    
    const allDrives = await Drive.find({ 
      createdAt: { $gte: startDate },
      isHidden: { $ne: true }
    }).select('createdAt');
    
    const allCourses = await CourseLink.find({ 
      createdAt: { $gte: startDate },
      isHidden: { $ne: true }
    }).select('createdAt');
    
    // Count posts by interval
    const chartData = intervals.map(interval => {
      const countInInterval = (posts) => {
        return posts.filter(post => {
          const postDate = new Date(post.createdAt);
          return postDate >= interval.start && postDate <= interval.end;
        }).length;
      };
      
      return {
        label: interval.label,
        date: interval.date,
        Projects: countInInterval(allProjects),
        Internships: countInInterval(allInternships),
        Hackathons: countInInterval(allHackathons),
        Drives: countInInterval(allDrives),
        Courses: countInInterval(allCourses),
      };
    });
    
    // Total counts for the period
    const postedStats = {
      projects: allProjects.length,
      internships: allInternships.length,
      hackathons: allHackathons.length,
      drives: allDrives.length,
      courses: allCourses.length,
    };
    
    res.json({
      success: true,
      data: {
        totalUsers,
        postedStats,
        chartData,
        period: period || 'month',
        startDate,
        endDate: now
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics'
    });
  }
});

module.exports = router;

