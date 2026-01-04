import { useState, useEffect } from 'react';
import { recommendationAPI } from '../utils/api';
import { useGlobal } from '../context/GlobalContext';
import { useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import { FaLightbulb, FaSync, FaBookOpen, FaArrowRight, FaClock } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { formatRelativeTime } from '../utils/helpers';

const Recommendations = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addNotification } = useGlobal();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await recommendationAPI.get();
      setRecommendations(response.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to fetch recommendations' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const response = await recommendationAPI.refresh();
      setRecommendations(response.data);
      addNotification({ type: 'success', message: 'Recommendations refreshed!' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to refresh recommendations' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleCourseClick = (course) => {
    if (course?.link) {
      window.open(course.link, '_blank', 'noopener,noreferrer');
    } else {
      addNotification({ type: 'error', message: 'Course link not available' });
    }
  };

  if (loading) return <Loading text="Generating personalized recommendations..." />;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
            Your Recommendations
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg">
            Personalized suggestions based on your skills and interests
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 bg-amber-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-amber-600 transition disabled:opacity-50 shadow-md hover:shadow-lg text-sm sm:text-base w-full md:w-auto justify-center"
        >
          <FaSync className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Projects Section */}
      <div className="mb-12">
        <div className="flex items-center mb-4 sm:mb-6">
          <FaLightbulb className="text-yellow-500 text-xl sm:text-2xl mr-2 sm:mr-3" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Recommended Projects</h2>
        </div>
        
        {recommendations?.recommendedProjects?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recommendations.recommendedProjects.map((rec, index) => (
              <motion.div
                key={rec.project?._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleProjectClick(rec.project?._id)}
                className="bg-white/60 backdrop-blur-sm rounded-xl transition-all duration-300 cursor-pointer overflow-hidden border border-amber-100/50 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 group h-full flex flex-col"
              >
                <div className="p-4 sm:p-6 flex flex-col flex-1">
                  <div className="flex items-start mb-3 sm:mb-4">
                    <div className="bg-yellow-50 p-2 sm:p-3 rounded-lg mr-3 sm:mr-4 group-hover:bg-yellow-100 transition-colors flex-shrink-0">
                      <FaLightbulb className="text-yellow-500 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                        {rec.project?.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-amber-600 font-medium mb-1 sm:mb-2 line-clamp-1">{rec.reason}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-3 sm:mb-4 line-clamp-3 text-xs sm:text-sm leading-relaxed flex-1">
                    {rec.project?.description || 'No description available'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 min-h-[2.5rem]">
                    {rec.project?.domains?.slice(0, 3).map((domain) => (
                      <span
                        key={domain}
                        className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium whitespace-nowrap"
                      >
                        {domain}
                      </span>
                    ))}
                    {rec.project?.skills?.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium whitespace-nowrap"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-end pt-3 sm:pt-4 border-t border-gray-100 mt-auto">
                    <div className="flex items-center text-amber-600 group-hover:text-amber-700 font-medium text-xs sm:text-sm">
                      <span>View Details</span>
                      <FaArrowRight className="ml-1.5 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FaLightbulb className="text-gray-300 text-5xl mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No project recommendations available yet.</p>
            <p className="text-gray-400 text-sm mt-2">
              Complete your profile and join some projects to get personalized recommendations.
            </p>
          </div>
        )}
      </div>

      {/* Courses Section */}
      <div>
        <div className="flex items-center mb-4 sm:mb-6">
          <FaBookOpen className="text-amber-600 text-xl sm:text-2xl mr-2 sm:mr-3" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Recommended Courses</h2>
        </div>

        {recommendations?.courseRecommendations?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recommendations.courseRecommendations.map((rec, index) => (
              <motion.div
                key={rec.course?._id || rec.course}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-primary-300 group"
              >
                {/* Course Image */}
                {rec.course?.image && (
                  <div className="h-36 sm:h-48 w-full overflow-hidden bg-gray-100">
                    <img
                      src={rec.course.image}
                      alt={rec.course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-4 sm:p-6">
                  <div className="flex items-start mb-3 sm:mb-4">
                    <div className="bg-amber-50 p-2 sm:p-3 rounded-lg mr-3 sm:mr-4 group-hover:bg-primary-100 transition-colors flex-shrink-0">
                      <FaBookOpen className="text-amber-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                        {rec.course?.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-amber-600 font-medium mb-1 sm:mb-2">{rec.reason}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-3 sm:mb-4 line-clamp-3 text-xs sm:text-sm leading-relaxed">
                    {rec.course?.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    {rec.course?.category && (
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {rec.course.category}
                      </span>
                    )}
                    {rec.course?.subject && (
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-50 text-blue-700 rounded-full text-xs font-medium">
                        {rec.course.subject}
                      </span>
                    )}
                    {rec.course?.department && (
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                        {rec.course.department}
                      </span>
                    )}
                    {rec.course?.skills?.slice(0, 2).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 sm:pt-4 border-t border-gray-100 gap-2">
                    {rec.course?.createdAt && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-500">
                        <FaClock className="mr-1.5 sm:mr-2" />
                        <span>{formatRelativeTime(rec.course.createdAt)}</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseClick(rec.course);
                      }}
                      className="flex items-center bg-amber-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-amber-600 transition font-medium shadow-sm hover:shadow-md w-full sm:w-auto justify-center text-xs sm:text-sm"
                    >
                      <span>Open Course</span>
                      <FaArrowRight className="ml-1.5 sm:ml-2" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FaBookOpen className="text-gray-300 text-5xl mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No course recommendations available yet.</p>
            <p className="text-gray-400 text-sm mt-2">
              Add skills to your profile to get personalized course recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
