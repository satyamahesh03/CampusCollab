import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { internshipAPI } from '../utils/api';
import { formatDate, getDomainColor, domains, departments } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBookmark, FaExternalLinkAlt, FaPlus, FaTimes, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaMoneyBillWave, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { useParams, useNavigate } from 'react-router-dom';

const Internships = () => {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [availableDomains, setAvailableDomains] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [confirmingDeleteInternship, setConfirmingDeleteInternship] = useState(null);
  const { user } = useAuth();
  const { addNotification, refreshReminders, reminders } = useGlobal();
  const { id: internshipId } = useParams();
  const navigate = useNavigate();

  // Fetch all posts to populate filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await internshipAPI.getAll({});
        
        // Extract unique domains, departments, and years from all internships
        const uniqueDomains = [...new Set(
          response.data
            .map(internship => internship.domain)
            .filter(domain => domain)
        )].sort();
        
        const uniqueDepartments = [...new Set(
          response.data
            .flatMap(internship => internship.department || [])
            .filter(dept => dept)
        )].sort();
        
        const uniqueYears = [...new Set(
          response.data
            .flatMap(internship => internship.eligibleYears || [])
            .filter(year => year)
        )].sort((a, b) => a - b);
        
        setAvailableDomains(uniqueDomains);
        setAvailableDepartments(uniqueDepartments);
        setAvailableYears(uniqueYears);
      } catch (error) {
        // Silently fail - filters will use defaults
      }
    };
    
    if (!internshipId) {
      fetchFilterOptions();
    }
  }, [internshipId]);

  useEffect(() => {
    if (internshipId) {
      fetchSingleInternship(internshipId);
    } else {
      // Clear selected internship when navigating back (browser back button)
      setSelectedInternship(null);
    }
  }, [internshipId]);

  // Update saved state when reminders change
  useEffect(() => {
    if (reminders.length >= 0 && internships.length > 0) {
      setInternships(prevInternships => {
        // Get reminder IDs for internships
        const reminderItemIds = reminders
          .filter(r => r.itemType === 'internship')
          .map(r => {
            // Handle both itemId (string) and item._id (object) formats
            const itemId = r.itemId || r.item?._id;
            return itemId?.toString();
          });
        
        return prevInternships.map(item => {
          const isInReminders = reminderItemIds.includes(item._id?.toString());
          // Always update based on reminders (reminders are source of truth)
          return { ...item, _isSaved: isInReminders };
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders]);

  useEffect(() => {
    if (!internshipId) {
      fetchInternships();
    }
  }, [filters, internshipId]);

  const fetchSingleInternship = async (id) => {
    try {
      setLoading(true);
      const response = await internshipAPI.getById(id);
      setSelectedInternship(response.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Internship not found' });
      navigate('/internships');
    } finally {
      setLoading(false);
    }
  };

  const fetchInternships = async () => {
    try {
      setLoading(true);
      const response = await internshipAPI.getAll(filters);
      // Preserve saved state from previous data and check reminders
      setInternships(prevInternships => {
        const newInternships = response.data;
        // Get reminder IDs for internships
        const reminderItemIds = reminders
          .filter(r => r.itemType === 'internship')
          .map(r => {
            // Handle both itemId (string) and item._id (object) formats
            const itemId = r.itemId || r.item?._id;
            return itemId?.toString();
          });
        
        return newInternships.map(newItem => {
          const prevItem = prevInternships.find(p => p._id === newItem._id);
          // Check if item is in reminders list
          const isInReminders = reminderItemIds.includes(newItem._id?.toString());
          // Preserve optimistic state or use reminders check
          const savedState = prevItem?._isSaved !== undefined ? prevItem._isSaved : isInReminders;
          return { ...newItem, _isSaved: savedState };
        });
      });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to fetch internships' });
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async (id) => {
    if (!user) {
      addNotification({ 
        type: 'error', 
        message: 'Please login to save internships' 
      });
      return;
    }

    try {
      // Find the internship to check if it's already saved
      // Check both the list and the selected internship (if viewing detail)
      const internship = internships.find(i => i._id === id) || (selectedInternship && selectedInternship._id === id ? selectedInternship : null);
      if (!internship) {
        addNotification({ 
          type: 'error', 
          message: 'Internship not found' 
        });
        return;
      }

      const wasSaved = Array.isArray(internship.likes) && internship.likes.some(likeId => 
        likeId === user.id || likeId.toString() === user.id?.toString()
      );
      
      // Optimistic update - update UI immediately
      setInternships(prevInternships => 
        prevInternships.map(i => {
          if (i._id === id) {
            // If likes is an array, toggle the user ID
            if (Array.isArray(i.likes)) {
              const newLikes = wasSaved 
                ? i.likes.filter(likeId => likeId !== user.id && likeId?.toString() !== user.id?.toString())
                : [...i.likes, user.id];
              return { ...i, likes: newLikes };
            } else {
              // If likes is a number, convert to array format for optimistic update
              const currentCount = typeof i.likes === 'number' ? i.likes : 0;
              return { 
                ...i, 
                likes: wasSaved 
                  ? currentCount - 1 
                  : currentCount + 1,
                _isSaved: !wasSaved // Track saved state separately
              };
            }
          }
          return i;
        })
      );
      
      await internshipAPI.like(id);
      
      addNotification({ 
        type: 'success', 
        message: wasSaved ? 'Removed from reminders!' : 'Saved to reminders!' 
      });
      
      // Refresh the internships list
      fetchInternships();
      
      // If viewing this internship's detail, refresh the selected internship
      if (selectedInternship && selectedInternship._id === id) {
        fetchSingleInternship(id);
      }
      
      // Refresh reminders in GlobalContext
      refreshReminders();
    } catch (error) {
      console.error('Error saving internship:', error);
      addNotification({ 
        type: 'error', 
        message: error?.message || 'Failed to update internship' 
      });
    }
  };

  // If viewing a specific internship, show only the internship detail page
  if ((internshipId || selectedInternship) && selectedInternship) {
    return (
      <>
        {/* Internship Detail View - Full Page */}
        <InternshipDetailView
          internship={selectedInternship}
          onClose={() => {
            setSelectedInternship(null);
            navigate('/internships');
          }}
          onSave={handleSave}
          userId={user?.id}
        />
        {/* Create Modal */}
        {showCreateModal && (
          <CreateInternshipModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchInternships}
          />
        )}
      </>
    );
  }

  // Otherwise, show the internships list
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Internships</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Explore internship opportunities</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {user?.role === 'faculty' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-amber-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-amber-600 transition text-sm sm:text-base flex-1 sm:flex-initial justify-center"
            >
              <FaPlus />
              <span>Post Internship</span>
            </button>
          )}
        </div>
      </div>
      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        showYear={false}
        domains={availableDomains.length > 0 ? availableDomains : null}
        departments={availableDepartments.length > 0 ? availableDepartments : null}
      />

      {/* Mode Filter */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => setFilters({ ...filters, mode: undefined })}
          className={`px-3 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm flex-1 sm:flex-initial ${
            !filters.mode
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Modes
        </button>
        <button
          onClick={() => setFilters({ ...filters, mode: 'virtual' })}
          className={`px-3 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm flex-1 sm:flex-initial ${
            filters.mode === 'virtual'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Virtual
        </button>
        <button
          onClick={() => setFilters({ ...filters, mode: 'offline' })}
          className={`px-3 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm flex-1 sm:flex-initial ${
            filters.mode === 'offline'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Offline
        </button>
        <button
          onClick={() => setFilters({ ...filters, mode: 'hybrid' })}
          className={`px-3 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm flex-1 sm:flex-initial ${
            filters.mode === 'hybrid'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Hybrid
        </button>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div
              key={index}
              className="bg-white/60 backdrop-blur-sm rounded-lg p-6 sm:p-8 border border-transparent h-full flex flex-col animate-pulse"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                <div className="h-6 bg-gray-200 rounded-lg w-3/4"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-lg flex-shrink-0"></div>
              </div>

              {/* Company */}
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>

              {/* Info rows */}
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-center">
                  <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="flex items-center">
                  <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                </div>
                <div className="flex items-center">
                  <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs sm:text-sm pt-3 border-t border-gray-100 mt-auto">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : internships.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No active internships found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {internships.map((internship, index) => {
            const isOwner = internship.postedBy?._id === user?.id || internship.postedBy === user?.id;
            
            return (
              <motion.div
                key={internship._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg cursor-pointer p-6 sm:p-8 border border-transparent hover:border-amber-300 h-full flex flex-col"
                onClick={() => navigate(`/internships/${internship._id}`)}
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 hover:text-amber-600 transition flex-1">
                    {internship.title}
                  </h3>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(internship._id);
                      }}
                      className={`p-1.5 sm:p-2 min-w-[32px] min-h-[32px] flex items-center justify-center ${
                        (Array.isArray(internship.likes) && internship.likes.some(likeId => likeId === user?.id || likeId.toString() === user?.id?.toString())) || internship._isSaved
                          ? 'text-amber-600' 
                          : 'text-gray-400'
                      } hover:text-amber-600 transition`}
                    >
                      <FaBookmark size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    {isOwner && (
                      <div className="relative flex flex-col items-end">
                        {confirmingDeleteInternship === internship._id && (
                          <div className="flex items-center gap-2 mb-1 -mt-2">
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  await internshipAPI.delete(internship._id);
                                  setConfirmingDeleteInternship(null);
                                  addNotification({
                                    type: 'success',
                                    message: 'Internship deleted successfully!',
                                  });
                                  fetchInternships();
                                } catch (error) {
                                  addNotification({
                                    type: 'error',
                                    message: 'Failed to delete internship',
                                  });
                                }
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
                                setConfirmingDeleteInternship(null);
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
                            if (confirmingDeleteInternship !== internship._id) {
                              setConfirmingDeleteInternship(internship._id);
                            }
                          }}
                          disabled={confirmingDeleteInternship === internship._id}
                          className="p-1.5 sm:p-2 text-red-600 rounded-lg transition-all min-w-[32px] min-h-[32px] flex items-center justify-center hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          title="Delete internship"
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="text-base sm:text-lg transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              <p className="text-amber-600 font-medium mb-2 sm:mb-3 text-sm sm:text-base">{internship.company}</p>

              {/* Domain Badge */}
              <div className="mb-2 sm:mb-3">
                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getDomainColor(internship.domain)}`}>
                  {internship.domain}
                </span>
              </div>

              {/* Key Info */}
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 mt-auto">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <FaMapMarkerAlt className="text-gray-400 text-xs sm:text-sm flex-shrink-0" />
                  <span className="break-words">{internship.location} • {internship.mode}</span>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <FaClock className="text-gray-400 text-xs sm:text-sm flex-shrink-0" />
                  <span>{internship.duration}</span>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <FaMoneyBillWave className="text-gray-400 text-xs sm:text-sm flex-shrink-0" />
                  <span>{internship.stipend}</span>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <FaCalendarAlt className="text-gray-400 text-xs sm:text-sm flex-shrink-0" />
                  <span>Apply by {formatDate(internship.applicationDeadline)}</span>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateInternshipModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchInternships}
        />
      )}
    </div>
  );
};

const InternshipDetailView = ({ internship, onClose, onSave, userId }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useAuth();
  const isSaved = Array.isArray(internship.likes) && internship.likes.some(likeId => 
    likeId === userId || likeId.toString() === userId?.toString()
  );
  const isOwner = internship.postedBy?._id === user?.id || internship.postedBy === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header with Back button */}
        <div className="flex justify-start items-center mb-4 sm:mb-6">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition text-sm sm:text-base"
          >
            <FaArrowLeft />
            <span>Back to Internships</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-transparent rounded-lg p-4 sm:p-6 md:p-8 lg:p-10">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                <div className="flex-1 pr-0 sm:pr-8">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                      {internship.title}
                    </h2>
                    {isOwner && (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                        title="Edit internship"
                        type="button"
                      >
                        <FaEdit className="text-base sm:text-lg" />
                      </button>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl text-amber-600 font-semibold">
                    {internship.company}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(internship._id);
                  }}
                  className={`p-2 transition ${
                    isSaved
                      ? 'text-amber-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FaBookmark size={24} />
                </button>
              </div>

              {/* Domain Badge */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDomainColor(internship.domain)}`}>
                  {internship.domain}
                </span>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 mb-1">
                    <FaMapMarkerAlt className="text-xs sm:text-sm" />
                    <span className="text-xs font-medium">Location</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">{internship.location}</p>
                  <p className="text-xs text-gray-600 capitalize">{internship.mode}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 mb-1">
                    <FaClock className="text-xs sm:text-sm" />
                    <span className="text-xs font-medium">Duration</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">{internship.duration}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 mb-1">
                    <FaMoneyBillWave className="text-xs sm:text-sm" />
                    <span className="text-xs font-medium">Stipend</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">{internship.stipend}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 mb-1">
                    <FaCalendarAlt className="text-xs sm:text-sm" />
                    <span className="text-xs font-medium">Deadline</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                    {formatDate(internship.applicationDeadline)}
                  </p>
                </div>
              </div>
            </div>

          {/* Divider */}
          <hr className="my-6" />

          {/* Description */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">About this Internship</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
              {internship.description}
            </p>
          </div>

          {/* Requirements */}
          {internship.requirements && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {internship.requirements}
              </p>
            </div>
          )}

          {/* Eligible Departments */}
          {internship.department && internship.department.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Eligible Departments</h3>
              <div className="flex flex-wrap gap-2">
                {internship.department.map((dept) => (
                  <span
                    key={dept}
                    className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <hr className="my-6" />

          {/* Apply Button */}
          <div className="flex justify-center">
            <a
              href={internship.applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-amber-500 text-white px-8 py-4 rounded-lg hover:bg-amber-600 transition font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              <span>Apply Now</span>
              <FaExternalLinkAlt />
            </a>
          </div>

          {/* Posted By */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Posted by {internship.postedBy?.name} • {internship.postedBy?.department}
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && (
        <EditInternshipModal
          internship={internship}
          onClose={() => setShowEditModal(false)}
          onSuccess={async () => {
            // Refresh the page or refetch data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

const CreateInternshipModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    mode: '',
    applicationDeadline: '',
    department: [],
    domain: '',
    duration: '',
    stipend: '',
    location: '',
    applyLink: '',
  });
  const [loading, setLoading] = useState(false);
  const { addNotification } = useGlobal();

  const toggleDepartment = (dept) => {
    if (formData.department.includes(dept)) {
      setFormData({
        ...formData,
        department: formData.department.filter(d => d !== dept)
      });
    } else {
      setFormData({
        ...formData,
        department: [...formData.department, dept]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate at least one department is selected
    if (formData.department.length === 0) {
      addNotification({
        type: 'error',
        message: 'Please select at least one eligible department',
      });
      return;
    }
    
    try {
      setLoading(true);
      await internshipAPI.create(formData);
      addNotification({
        type: 'success',
        message: 'Internship posted successfully!',
      });
      onSuccess();
      onClose();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to post internship',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 sm:p-6 md:p-8 lg:p-10 max-w-3xl md:max-w-4xl lg:max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative"
      >
        {/* Close Button - Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-amber-100 rounded-full transition-colors z-10"
          title="Close"
        >
          <FaTimes className="text-lg" />
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-10 text-amber-900">Post Internship Opportunity</h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Title */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., Summer Internship 2024"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="Company name"
              />
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              >
                <option value="">Select Mode</option>
                <option value="virtual">Virtual</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Domain <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              >
                <option value="">Select Domain</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Duration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., 3 months"
              />
            </div>

            {/* Stipend */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">Stipend (Optional)</label>
              <input
                type="text"
                value={formData.stipend}
                onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., ₹20,000/month or leave blank for unpaid"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">Location (Optional)</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="City or leave blank for Remote"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Application Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Eligible Departments <span className="text-red-500">*</span>
            </label>
            
            {/* Selected Departments Display */}
            {formData.department.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-amber-100 rounded-lg border border-amber-200">
                {formData.department.map((dept) => (
                  <span
                    key={dept}
                    className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-medium flex items-center space-x-2"
                  >
                    <span>{dept}</span>
                    <button
                      type="button"
                      onClick={() => toggleDepartment(dept)}
                      className="hover:text-red-600"
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Department Checkboxes */}
            <div className="border-0 rounded-lg p-3 sm:p-4 max-h-48 overflow-y-auto bg-amber-50 focus-within:border focus-within:border-amber-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {departments.map((dept) => (
                  <label
                    key={dept}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-amber-50 p-1.5 sm:p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.department.includes(dept)}
                      onChange={() => toggleDepartment(dept)}
                      className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500 flex-shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">{dept}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select all applicable departments</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-amber-900">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-2 focus:border-amber-500 bg-amber-50 resize-y focus:outline-none"
              placeholder="Describe the internship role and responsibilities..."
            />
          </div>

          {/* Apply Link */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
              Application Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.applyLink}
              onChange={(e) => setFormData({ ...formData, applyLink: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-amber-600 transition font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Posting...
                </>
              ) : (
                'Post Internship'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const EditInternshipModal = ({ internship, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: internship.title || '',
    company: internship.company || '',
    description: internship.description || '',
    mode: internship.mode || '',
    applicationDeadline: internship.applicationDeadline ? new Date(internship.applicationDeadline).toISOString().split('T')[0] : '',
    department: internship.department || [],
    domain: internship.domain || '',
    duration: internship.duration || '',
    stipend: internship.stipend || '',
    location: internship.location || '',
    applyLink: internship.applyLink || '',
  });
  const [loading, setLoading] = useState(false);
  const { addNotification } = useGlobal();

  const toggleDepartment = (dept) => {
    if (formData.department.includes(dept)) {
      setFormData({
        ...formData,
        department: formData.department.filter(d => d !== dept)
      });
    } else {
      setFormData({
        ...formData,
        department: [...formData.department, dept]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate at least one department is selected
    if (formData.department.length === 0) {
      addNotification({
        type: 'error',
        message: 'Please select at least one eligible department',
      });
      return;
    }
    
    try {
      setLoading(true);
      await internshipAPI.update(internship._id, formData);
      addNotification({
        type: 'success',
        message: 'Internship updated successfully!',
      });
      onSuccess();
      onClose();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to update internship',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 sm:p-6 md:p-8 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative"
      >
        {/* Close Button - Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-amber-100 rounded-full transition-colors z-10"
          title="Close"
        >
          <FaTimes className="text-lg" />
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-10 text-amber-900">Edit Internship</h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Title */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., Summer Internship 2024"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="Company name"
              />
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              >
                <option value="">Select Mode</option>
                <option value="virtual">Virtual</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Domain <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              >
                <option value="">Select Domain</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Duration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., 3 months"
              />
            </div>

            {/* Stipend */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">Stipend (Optional)</label>
              <input
                type="text"
                value={formData.stipend}
                onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., ₹20,000/month or leave blank for unpaid"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">Location (Optional)</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="City or leave blank for Remote"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Application Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Eligible Departments <span className="text-red-500">*</span>
            </label>
            
            {/* Selected Departments Display */}
            {formData.department.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-amber-100 rounded-lg border border-amber-200">
                {formData.department.map((dept) => (
                  <span
                    key={dept}
                    className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-medium flex items-center space-x-2"
                  >
                    <span>{dept}</span>
                    <button
                      type="button"
                      onClick={() => toggleDepartment(dept)}
                      className="hover:text-red-600"
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Department Checkboxes */}
            <div className="border-0 rounded-lg p-3 sm:p-4 max-h-48 overflow-y-auto bg-amber-50 focus-within:border focus-within:border-amber-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {departments.map((dept) => (
                  <label
                    key={dept}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-amber-50 p-1.5 sm:p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.department.includes(dept)}
                      onChange={() => toggleDepartment(dept)}
                      className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500 flex-shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">{dept}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select all applicable departments</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-amber-900">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-2 focus:border-amber-500 bg-amber-50 resize-y focus:outline-none"
              placeholder="Describe the internship role and responsibilities..."
            />
          </div>

          {/* Apply Link */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
              Application Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.applyLink}
              onChange={(e) => setFormData({ ...formData, applyLink: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-amber-600 transition font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Internship'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Internships;

