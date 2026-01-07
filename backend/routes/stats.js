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
const formatDateLabel = (date, period, weekIndex = null) => {
  const d = new Date(date);
  
  // Validate date
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  if (period === 'week') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[d.getDay()];
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    return `${dayName} ${day}`;
  } else {
    // For month view, return week labels with date range
    try {
      const weekStart = new Date(d);
      const weekEnd = new Date(d);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Ensure dates are valid
      if (isNaN(weekStart.getTime()) || isNaN(weekEnd.getTime())) {
        // Fallback to simple format
        const month = d.toLocaleString('default', { month: 'short' });
        const day = d.getDate();
        return `${month} ${day}`;
      }
      
      const startMonth = weekStart.toLocaleString('default', { month: 'short' });
      const startDay = weekStart.getDate();
      const endMonth = weekEnd.toLocaleString('default', { month: 'short' });
      const endDay = weekEnd.getDate();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
      } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
      }
    } catch (error) {
      // Fallback format if anything fails
      const month = d.toLocaleString('default', { month: 'short' });
      const day = d.getDate();
      return `${month} ${day}`;
    }
  }
};

// @route   GET /api/stats/home
// @desc    Get optimized home page data (trending projects, upcoming drives, stats)
// @access  Public
router.get('/home', async (req, res) => {
  try {
    // Use Promise.all to fetch everything in parallel with optimized queries
    const [
      totalUsers,
      trendingProjects,
      upcomingDrives,
      stats
    ] = await Promise.all([
      // Total users count - optimized
      User.countDocuments({ isSuspended: { $ne: true } }),
      
      // Trending projects - use aggregation for efficiency
      Project.aggregate([
        { 
          $match: { 
            isHidden: { $ne: true }, 
            status: { $ne: 'closed' } 
          } 
        },
        { 
          $addFields: { 
            likesCount: { $size: { $ifNull: ['$likes', []] } } 
          } 
        },
        { $sort: { likesCount: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy',
            pipeline: [
              { $project: { name: 1, department: 1 } }
            ]
          }
        },
        { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            domains: 1,
            likes: 1,
            comments: 1,
            participants: 1,
            createdAt: 1,
            createdBy: {
              name: '$createdBy.name',
              department: '$createdBy.department'
            }
          }
        }
      ]),
      
      // Upcoming drives - optimized query with select and limit
      Drive.find({
        isHidden: { $ne: true },
        driveDate: { $gte: new Date() }
      })
        .select('title company jobRole driveDate package')
        .populate('postedBy', 'name department')
        .sort({ driveDate: 1 })
        .limit(3)
        .lean(),
      
      // Stats using countDocuments for efficiency
      Promise.all([
        Project.countDocuments({ isHidden: { $ne: true } }),
        Project.countDocuments({ isHidden: { $ne: true }, status: 'open' }),
        Project.countDocuments({ isHidden: { $ne: true }, status: 'closed' }),
        Hackathon.countDocuments({ isHidden: { $ne: true } }),
        Internship.countDocuments({ isHidden: { $ne: true } }),
        Drive.countDocuments({ isHidden: { $ne: true } }),
        CourseLink.countDocuments({ isHidden: { $ne: true } })
      ]).then(([totalProjects, activeProjects, completedProjects, totalHackathons, totalInternships, totalDrives, totalResources]) => ({
        totalProjects,
        activeProjects,
        completedProjects,
        totalHackathons,
        totalInternships,
        totalDrives,
        totalResources
      }))
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        trendingProjects,
        upcomingDrives,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching home data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching home data'
    });
  }
});

// @route   GET /api/stats/public
// @desc    Get public statistics (users count and posted data statistics with breakdown)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // 'week' or 'month', default to 'month'
    
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
      startDate.setHours(0, 0, 0, 0);
      
      // Create week-wise intervals
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        // Generate label for this week
        const label = formatDateLabel(weekStart, 'month', i);
        
        intervals.push({
          date: weekStart.toISOString(),
          label: label,
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

