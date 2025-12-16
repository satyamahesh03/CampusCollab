import { useState, useEffect } from 'react';
import { courseLinkAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { departments, formatRelativeTime } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { FaExternalLinkAlt, FaBook, FaPlus, FaUser, FaClock, FaShare, FaArrowLeft } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

const CourseLinks = () => {
  const [courseLinks, setCourseLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { user } = useAuth();
  const { addNotification } = useGlobal();
  const { id: courseId } = useParams();
  const navigate = useNavigate();

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

  const handleShare = (course) => {
    const url = `${window.location.origin}/courses/${course._id}`;
    navigator.clipboard.writeText(url).then(() => {
      addNotification({ type: 'success', message: 'Link copied to clipboard!' });
    }).catch(() => {
      addNotification({ type: 'error', message: 'Failed to copy link' });
    });
  };

  const handleCourseClick = (course) => {
    navigate(`/courses/${course._id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          {(courseId || selectedCourse) && (
            <button
              onClick={() => {
                setSelectedCourse(null);
                navigate('/courses');
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
            >
              <FaArrowLeft />
              <span>Back to Courses</span>
            </button>
          )}
          {!(courseId || selectedCourse) && (
            <div>
              <h1 className="text-3xl font-bold">Course Resources</h1>
              <p className="text-gray-600 mt-1">Learning materials and resources</p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {(courseId || selectedCourse) && (
            <button
              onClick={() => handleShare(selectedCourse)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <FaShare />
              <span>Share</span>
            </button>
          )}
          {user?.role === 'faculty' && !(courseId || selectedCourse) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
            >
              <FaPlus />
              <span>Add Resource</span>
            </button>
          )}
        </div>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} showDomain={false} showYear={false} />
      
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
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all h-full flex flex-col"
            >
              {/* Course Image */}
              {course.image ? (
                <div className="h-44 w-full overflow-hidden bg-gray-100">
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
                <div className="h-44 w-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <FaBook className="text-5xl text-primary-600 opacity-60" />
                </div>
              )}

              {/* Content */}
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                  {course.title}
                </h3>
                
                {course.description && (
                  <p className="text-gray-600 mb-4 text-sm line-clamp-3">
                    {course.description}
                  </p>
                )}

                {/* Faculty Name and Timestamp */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <FaUser className="mr-2 text-primary-600" />
                    <span className="font-medium">
                      {course.postedBy?.name || 'Unknown'}
                    </span>
                    {course.postedBy?.department && (
                      <span className="ml-2 text-gray-500">
                        • {course.postedBy.department}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <FaClock className="mr-2" />
                    <span>{formatRelativeTime(course.createdAt)}</span>
                  </div>
                </div>

                <a
                  href={course.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-auto flex items-center justify-center space-x-2 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition font-medium shadow-sm hover:shadow-md w-full"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold mb-6">Add Course Resource</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Link - Primary Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Course Link <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={formData.link}
                onChange={(e) => {
                  setFormData({ ...formData, link: e.target.value });
                  setMetadataFetched(false);
                }}
                required
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="https://www.udemy.com/course/... or YouTube link"
              />
              <button
                type="button"
                onClick={handleFetchMetadata}
                disabled={fetchingMetadata || !formData.link}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
            <label className="block text-sm font-medium mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
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
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
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
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Description - Editable */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={!formData.department || !formData.link}
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Resource
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CourseLinks;

