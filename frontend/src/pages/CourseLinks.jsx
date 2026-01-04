import { useState, useEffect } from 'react';
import { courseLinkAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { departments, formatRelativeTime } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { FaExternalLinkAlt, FaBook, FaPlus, FaUser, FaClock, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

const CourseLinks = () => {
  const [courseLinks, setCourseLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [confirmingDeleteCourse, setConfirmingDeleteCourse] = useState(null);
  const { user } = useAuth();
  const { addNotification } = useGlobal();
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  // Fetch all posts to populate filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await courseLinkAPI.getAll({});
        
        // Extract unique departments from all course links
        const uniqueDepartments = [...new Set(
          response.data
            .map(course => course.department)
            .filter(dept => dept)
        )].sort();
        
        setAvailableDepartments(uniqueDepartments);
      } catch (error) {
        // Silently fail - filters will use defaults
      }
    };
    
    if (!courseId) {
      fetchFilterOptions();
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchSingleCourse(courseId);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) {
      fetchCourseLinks();
    }
  }, [filters, courseId]);

  const fetchSingleCourse = async (id) => {
    try {
      setLoading(true);
      const response = await courseLinkAPI.getById(id);
      setSelectedCourse(response.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Course not found' });
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseLinks = async () => {
    try {
      setLoading(true);
      const response = await courseLinkAPI.getAll(filters);
      setCourseLinks(response.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to fetch course links' });
    } finally {
      setLoading(false);
    }
  };


  const handleCourseClick = (course) => {
    navigate(`/courses/${course._id}`);
  };

  const handleDeleteClick = (courseId) => {
    setConfirmingDeleteCourse(courseId);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmingDeleteCourse) return;
    
    try {
      await courseLinkAPI.delete(confirmingDeleteCourse);
      setConfirmingDeleteCourse(null);
      fetchCourseLinks();
      if (selectedCourse && selectedCourse._id === confirmingDeleteCourse) {
        setSelectedCourse(null);
        navigate('/courses');
      }
      addNotification({
        type: 'success',
        message: 'Course deleted successfully!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to delete course',
      });
    }
  };

  const handleDeleteCancel = () => {
    setConfirmingDeleteCourse(null);
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
          {(courseId || selectedCourse) && (
            <button
              onClick={() => {
                setSelectedCourse(null);
                navigate('/courses');
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition text-sm sm:text-base"
            >
              <FaArrowLeft />
              <span>Back to Courses</span>
            </button>
          )}
          {!(courseId || selectedCourse) && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Course Resources</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Learning materials and resources</p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
          {user?.role === 'faculty' && !(courseId || selectedCourse) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-amber-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-amber-600 transition text-sm sm:text-base flex-1 sm:flex-initial justify-center"
            >
              <FaPlus />
              <span>Add Resource</span>
            </button>
          )}
        </div>
      </div>
      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        showDomain={false} 
        showYear={false}
        departments={availableDepartments.length > 0 ? availableDepartments : null}
      />
      
      {loading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {courseLinks.map((course, index) => (
            <motion.div
              key={course._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/60 backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-300 h-full flex flex-col border border-amber-100/50 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Course Image */}
              {course.image ? (
                <div className="h-36 sm:h-44 w-full overflow-hidden bg-gray-100">
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%239ca3af"%3E📚 Course%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              ) : (
                <div className="h-36 sm:h-44 w-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <FaBook className="text-3xl sm:text-5xl text-amber-600 opacity-60" />
                </div>
              )}

              {/* Content */}
              <div className="p-4 sm:p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-2 flex-1">
                    {course.title}
                  </h3>
                  {(course.postedBy?._id === user?.id || course.postedBy === user?.id) && (
                    <div className="relative flex flex-col items-end">
                      {confirmingDeleteCourse === course._id && (
                        <div className="flex items-center gap-2 mb-1 -mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteConfirm();
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteCancel();
                            }}
                            className="px-3 py-1.5 bg-amber-200 text-amber-900 text-xs font-medium rounded-md hover:bg-amber-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirmingDeleteCourse !== course._id) {
                            handleDeleteClick(course._id);
                          }
                        }}
                        disabled={confirmingDeleteCourse === course._id}
                        className="p-1.5 sm:p-2 text-red-600 rounded-lg transition-all flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        title="Delete course"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="text-sm sm:text-base transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
                
                {course.description && (
                  <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm line-clamp-3">
                    {course.description}
                  </p>
                )}

                {/* Faculty Name and Timestamp */}
                <div className="mb-3 sm:mb-4 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <FaUser className="mr-1.5 sm:mr-2 text-amber-600 text-xs sm:text-sm" />
                    <span className="font-medium">
                      {course.postedBy?.name || 'Unknown'}
                    </span>
                    {course.postedBy?.department && (
                      <span className="ml-1.5 sm:ml-2 text-gray-500">
                        • {course.postedBy.department}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <FaClock className="mr-1.5 sm:mr-2 text-xs sm:text-sm" />
                    <span>{formatRelativeTime(course.createdAt)}</span>
                  </div>
                </div>

                <a
                  href={course.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-auto flex items-center justify-center space-x-2 bg-amber-500 text-white py-2 sm:py-2.5 rounded-lg hover:bg-amber-600 transition font-medium shadow-sm hover:shadow-md w-full text-xs sm:text-sm"
                >
                  <span>View Resource</span>
                  <FaExternalLinkAlt />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCourseLinkModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchCourseLinks}
        />
      )}
    </div>
  );
};

const CreateCourseLinkModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    image: '',
    category: 'General',
    subject: 'General',
    department: '',
    type: 'other',
    skills: [],
  });
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [metadataFetched, setMetadataFetched] = useState(false);
  const { user } = useAuth();
  const { addNotification } = useGlobal();

  const handleFetchMetadata = async () => {
    if (!formData.link) {
      addNotification({
        type: 'error',
        message: 'Please enter a URL first',
      });
      return;
    }

    try {
      setFetchingMetadata(true);
      const response = await courseLinkAPI.fetchMetadata(formData.link);
      
      setFormData({
        ...formData,
        title: response.data.title || formData.title,
        description: response.data.description || formData.description,
        image: response.data.image || formData.image,
        skills: response.data.skills || [],
      });
      
      setMetadataFetched(true);
      addNotification({
        type: 'success',
        message: 'Course details fetched successfully!',
      });
    } catch (error) {
      console.error('Error fetching metadata:', error);
      addNotification({
        type: 'error',
        message: 'Could not fetch course details. Please enter manually.',
      });
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      addNotification({
        type: 'error',
        message: 'Please provide a title for the course',
      });
      return;
    }

    try {
      await courseLinkAPI.create(formData);
      addNotification({
        type: 'success',
        message: 'Resource added successfully!',
      });
      onSuccess();
      onClose();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to add resource',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/60 backdrop-blur-sm rounded-lg p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative border border-amber-100/50"
      >
        {/* Close Button - Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors z-10"
          title="Close"
        >
          <FaTimes className="text-lg" />
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-10">Add Course Resource</h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Course Link - Primary Input */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Course Link <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={formData.link}
                onChange={(e) => {
                  setFormData({ ...formData, link: e.target.value });
                  setMetadataFetched(false);
                }}
                required
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="https://www.udemy.com/course/... or YouTube link"
              />
              <button
                type="button"
                onClick={handleFetchMetadata}
                disabled={fetchingMetadata || !formData.link}
                className="px-4 sm:px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
              >
                {fetchingMetadata ? 'Fetching...' : 'Fetch Details'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Paste any course URL (Udemy, YouTube, Coursera, etc.) and click "Fetch Details"
            </p>
          </div>

          {/* Department - Required */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Preview Section - Shown after fetching metadata */}
          {metadataFetched && (
            <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
              <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
              
              {formData.image && (
                <div className="mb-3">
                  <img 
                    src={formData.image} 
                    alt="Course preview" 
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
              
              {/* Title - Editable */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Description - Editable */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={!formData.department || !formData.link}
              className="w-full bg-amber-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-amber-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Add Resource
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CourseLinks;

