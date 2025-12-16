const express = require('express');
const router = express.Router();
const Recommendation = require('../models/Recommendation');
const Project = require('../models/Project');
const CourseLink = require('../models/CourseLink');
const { protect } = require('../middleware/auth');
const { getAllNextSkills, isNextSkill, normalizeSkill } = require('../config/skillMapping');

// Recommendation algorithm based on user skills and previously joined project domains
const generateRecommendations = async (user) => {
  try {
    const userSkills = user.skills || [];

    // Projects the user liked or joined
    const userProjects = await Project.find({
      $or: [
        { likes: user._id },
        { 'participants.user': user._id }
      ]
    });

    const userDomains = [...new Set(userProjects.flatMap(p => p.domains || []))];
    const userLikedIds = userProjects.map(p => p._id.toString());

    // Content-based candidates - only based on skills and domains from previously joined projects
    const contentProjects = await Project.find({
      status: 'open',
      createdBy: { $ne: user._id },
      $or: [
        { domains: { $in: userDomains } },
        { skills: { $in: userSkills } }
      ]
    });

    // Only use content-based projects (no collaborative filtering)
    const candidates = contentProjects;
    const seen = new Set();
    const scored = [];

    candidates.forEach((project) => {
      const id = project._id.toString();
      if (seen.has(id)) return;
      seen.add(id);
      if (userLikedIds.includes(id)) return; // skip already joined/liked

      let score = 0;
      const domainMatches = project.domains?.filter((d) => userDomains.includes(d)).length || 0;
      score += domainMatches * 10;

      // Case-insensitive skill matching
      const userSkillsLower = userSkills.map(u => normalizeSkill(u));
      const skillMatches = (project.skills || []).filter((s) => {
        if (!s) return false;
        const normalizedSkill = normalizeSkill(s);
        return userSkillsLower.includes(normalizedSkill);
      }).length;
      score += skillMatches * 8;

      // Only include projects that match domains or skills
      if (domainMatches === 0 && skillMatches === 0) {
        return; // Skip projects that don't match domains or skills
      }

      let reason = '';
      if (domainMatches > 0 && skillMatches > 0) {
        reason = `Matches your interests and skills`;
      } else if (domainMatches > 0) {
        reason = `Matches your interests in ${project.domains.slice(0, 2).join(', ')}`;
      } else if (skillMatches > 0) {
        reason = 'Matches your skills';
      }

      scored.push({
        project: project._id,
        score,
        reason
      });
    });

    scored.sort((a, b) => b.score - a.score);

    // Course recommendations (rule-based on skills/department/subject/category)
    const courseCandidates = await CourseLink.find({
      isHidden: { $ne: true }
    }).select('title description category subject department link postedBy createdAt skills');

    // Get all recommended next skills for the user (normalized)
    const userSkillsLower = userSkills.map(s => normalizeSkill(s));
    const nextSkills = getAllNextSkills(userSkills);

    const courseScores = courseCandidates
      .map((course) => {
        let cScore = 0;
        const text = `${course.title || ''} ${course.description || ''} ${course.category || ''} ${course.subject || ''}`.toLowerCase();

        // Get course skills (normalized to lowercase for comparison)
        let courseSkills = [];
        if (course.skills && course.skills.length > 0) {
          courseSkills = course.skills.map(s => s.trim());
        } else {
          // Fallback: extract skills from text if skills field is not available
          // This is a basic approach - in production, you'd want more sophisticated extraction
          courseSkills = [];
        }

        // Check if course primarily teaches skills the user already has (case-insensitive)
        const courseSkillsLower = courseSkills.map(s => normalizeSkill(s));
        const userSkillMatches = courseSkillsLower.filter(courseSkill =>
          userSkillsLower.includes(courseSkill)
        );

        // If course primarily teaches skills user already has, filter it out
        // A course is considered "primarily teaching existing skills" if more than 50% of its skills match user skills
        if (courseSkills.length > 0) {
          const matchRatio = userSkillMatches.length / courseSkills.length;
          if (matchRatio > 0.5) {
            // Filter out - return null to exclude from recommendations
            return null;
          }
        } else if (userSkills.length > 0) {
          // Fallback: check text matching for backward compatibility (only if user has skills)
          // Only filter if multiple user skills appear prominently in the text (case-insensitive)
          const textMatches = userSkills.filter((s) => text.includes(normalizeSkill(s))).length;
          // Only filter if more than 2 user skills match in text (to avoid being too aggressive)
          if (textMatches >= 2) {
            return null;
          }
        }

        // Check for "next skills" - courses teaching skills that are next in progression
        let nextSkillMatches = 0;
        if (courseSkills.length > 0) {
          nextSkillMatches = courseSkills.filter(courseSkill =>
            isNextSkill(courseSkill, userSkills)
          ).length;
        } else {
          // Fallback: check if any next skills appear in the text (case-insensitive)
          nextSkillMatches = nextSkills.filter(nextSkill =>
            text.includes(normalizeSkill(nextSkill))
          ).length;
        }

        // Boost score significantly for next skills (progressive learning)
        if (nextSkillMatches > 0) {
          cScore += nextSkillMatches * 15; // Higher weight for next skills
        }

        // Regular skill matches (skills not in user profile but not necessarily next skills)
        // Only count skills that aren't already in user profile and aren't next skills (case-insensitive)
        if (courseSkills.length > 0) {
          const regularSkillMatches = courseSkills.filter(courseSkill => {
            const courseSkillLower = normalizeSkill(courseSkill);
            return !userSkillsLower.includes(courseSkillLower) && 
                   !isNextSkill(courseSkill, userSkills);
          }).length;
          cScore += regularSkillMatches * 3; // Lower weight for unrelated new skills
        }

        // Department alignment
        if (course.department && user.department && course.department === user.department) {
          cScore += 8;
        }

        // Only include courses with "Learn next" or "Relevant to your department"
        const hasNextSkills = nextSkillMatches > 0;
        const hasDepartmentMatch = course.department && user.department && course.department === user.department;

        // Filter out courses that don't match the criteria
        if (!hasNextSkills && !hasDepartmentMatch) {
          return null;
        }

        // Recency boost
        cScore += 1;

        let reason = '';
        if (hasNextSkills) {
          const nextSkillNames = courseSkills.filter(courseSkill =>
            isNextSkill(courseSkill, userSkills)
          ).slice(0, 2);
          reason = `Learn next: ${nextSkillNames.join(', ')}`;
        } else if (hasDepartmentMatch) {
          reason = 'Relevant to your department';
        }

        return {
          course: course._id,
          score: cScore,
          reason
        };
      })
      .filter(course => course !== null) // Remove filtered courses
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      recommendedProjects: scored.slice(0, 15),
      courseRecommendations: courseScores,
      basedOnSkills: userSkills,
      basedOnDomains: userDomains
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      recommendedProjects: [],
      courseRecommendations: [],
      basedOnSkills: [],
      basedOnDomains: []
    };
  }
};

// @route   GET /api/recommendations
// @desc    Get personalized project recommendations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Try to get existing recommendations
    let recommendation = await Recommendation.findOne({ user: req.user._id })
      .populate('recommendedProjects.project')
      .populate('courseRecommendations.course');

    // If no recommendations or older than 24 hours, generate new ones
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (!recommendation || recommendation.lastUpdated < oneDayAgo) {
      const recoData = await generateRecommendations(req.user);
      
      if (recommendation) {
        // Update existing
        recommendation.recommendedProjects = recoData.recommendedProjects;
        recommendation.courseRecommendations = recoData.courseRecommendations;
        recommendation.basedOnSkills = recoData.basedOnSkills;
        recommendation.basedOnDomains = recoData.basedOnDomains;
        recommendation.lastUpdated = Date.now();
        await recommendation.save();
      } else {
        // Create new
        recommendation = await Recommendation.create({
          user: req.user._id,
          ...recoData
        });
      }
      
      // Populate after save
      recommendation = await Recommendation.findById(recommendation._id)
        .populate('recommendedProjects.project')
        .populate('courseRecommendations.course');
    }

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recommendations'
    });
  }
});

// @route   POST /api/recommendations/refresh
// @desc    Force refresh recommendations
// @access  Private
router.post('/refresh', protect, async (req, res) => {
  try {
    const recoData = await generateRecommendations(req.user);
    
    let recommendation = await Recommendation.findOne({ user: req.user._id });
    
    if (recommendation) {
      recommendation.recommendedProjects = recoData.recommendedProjects;
      recommendation.courseRecommendations = recoData.courseRecommendations;
      recommendation.basedOnSkills = recoData.basedOnSkills;
      recommendation.basedOnDomains = recoData.basedOnDomains;
      recommendation.lastUpdated = Date.now();
      await recommendation.save();
    } else {
      recommendation = await Recommendation.create({
        user: req.user._id,
        ...recoData
      });
    }

    recommendation = await Recommendation.findById(recommendation._id)
      .populate('recommendedProjects.project')
      .populate('courseRecommendations.course');

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error refreshing recommendations'
    });
  }
});

module.exports = router;

