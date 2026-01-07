import { useState, useEffect } from 'react';
import { driveAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { formatDate, departments } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaBookmark, FaTimes, FaExternalLinkAlt, FaCalendarAlt, FaMapMarkerAlt, FaMoneyBillWave, FaBriefcase, FaGraduationCap, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { useParams, useNavigate } from 'react-router-dom';

const Drives = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [confirmingDeleteDrive, setConfirmingDeleteDrive] = useState(null);
  const { user } = useAuth();
  const { addNotification, refreshReminders, reminders } = useGlobal();
  const { id: driveId } = useParams();
  const navigate = useNavigate();

  // Fetch all posts to populate filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await driveAPI.getAll({});
        
        // Extract unique departments and years from all drives
        const uniqueDepartments = [...new Set(
          response.data
            .flatMap(drive => drive.department || [])
            .filter(dept => dept)
        )].sort();
        
        const uniqueYears = [...new Set(
          response.data
            .flatMap(drive => drive.eligibleYears || [])
            .filter(year => year)
        )].sort((a, b) => a - b);
        
        setAvailableDepartments(uniqueDepartments);
        setAvailableYears(uniqueYears);
      } catch (error) {
        // Silently fail - filters will use defaults
      }
    };
    
    if (!driveId) {
      fetchFilterOptions();
    }
  }, [driveId]);

  useEffect(() => {
    if (driveId) {
      fetchSingleDrive(driveId);
    } else {
      // Clear selected drive when navigating back (browser back button)
      setSelectedDrive(null);
    }
  }, [driveId]);

  // Update saved state when reminders change
  useEffect(() => {
    if (reminders.length >= 0 && drives.length > 0) {
      setDrives(prevDrives => {
        // Get reminder IDs for drives
        const reminderItemIds = reminders
          .filter(r => r.itemType === 'drive')
          .map(r => {
            // Handle both itemId (string) and item._id (object) formats
            const itemId = r.itemId || r.item?._id;
            return itemId?.toString();
          });
        
        return prevDrives.map(item => {
          const isInReminders = reminderItemIds.includes(item._id?.toString());
          // Always update based on reminders (reminders are source of truth)
          return { ...item, _isSaved: isInReminders };
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders]);

  useEffect(() => {
    if (!driveId) {
      fetchDrives();
    }
  }, [filters, driveId]);

  const fetchSingleDrive = async (id) => {
    try {
      setLoading(true);
      const response = await driveAPI.getById(id);
      setSelectedDrive(response.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Drive not found' });
      navigate('/drives');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const response = await driveAPI.getAll(filters);
      // Preserve saved state from previous data and check reminders
      setDrives(prevDrives => {
        const newDrives = response.data;
        // Get reminder IDs for drives
        const reminderItemIds = reminders
          .filter(r => r.itemType === 'drive')
          .map(r => {
            // Handle both itemId (string) and item._id (object) formats
            const itemId = r.itemId || r.item?._id;
            return itemId?.toString();
          });
        
        return newDrives.map(newItem => {
          const prevItem = prevDrives.find(p => p._id === newItem._id);
          // Check if item is in reminders list
          const isInReminders = reminderItemIds.includes(newItem._id?.toString());
          // Preserve optimistic state or use reminders check
          const savedState = prevItem?._isSaved !== undefined ? prevItem._isSaved : isInReminders;
          return { ...newItem, _isSaved: savedState };
        });
      });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to fetch drives' });
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async (id) => {
    if (!user) {
      addNotification({ 
        type: 'error', 
        message: 'Please login to save drives' 
      });
      return;
    }

    try {
      // Find the drive to check if it's already saved
      // Check both the list and the selected drive (if viewing detail)
      const drive = drives.find(d => d._id === id) || (selectedDrive && selectedDrive._id === id ? selectedDrive : null);
      if (!drive) {
        addNotification({ 
          type: 'error', 
          message: 'Drive not found' 
        });
        return;
      }

      const wasSaved = Array.isArray(drive.likes) && drive.likes.some(likeId => 
        likeId === user.id || likeId.toString() === user.id?.toString()
      );
      
      // Optimistic update - update UI immediately
      setDrives(prevDrives => 
        prevDrives.map(d => {
          if (d._id === id) {
            // If likes is an array, toggle the user ID
            if (Array.isArray(d.likes)) {
              const newLikes = wasSaved 
                ? d.likes.filter(likeId => likeId !== user.id && likeId?.toString() !== user.id?.toString())
                : [...d.likes, user.id];
              return { ...d, likes: newLikes };
            } else {
              // If likes is a number, convert to array format for optimistic update
              const currentCount = typeof d.likes === 'number' ? d.likes : 0;
              return { 
                ...d, 
                likes: wasSaved 
                  ? currentCount - 1 
                  : currentCount + 1,
                _isSaved: !wasSaved // Track saved state separately
              };
            }
          }
          return d;
        })
      );
      
      await driveAPI.like(id);
      
      addNotification({ 
        type: 'success', 
        message: wasSaved ? 'Removed from reminders!' : 'Saved to reminders!' 
      });
      
      fetchDrives();
      
      // If viewing this drive's detail, refresh the selected drive
      if (selectedDrive && selectedDrive._id === id) {
        fetchSingleDrive(id);
      }
      
      refreshReminders();
    } catch (error) {
      console.error('Error saving drive:', error);
      addNotification({ 
        type: 'error', 
        message: error?.message || 'Failed to update drive' 
      });
    }
  };

  // If viewing a specific drive, show only the drive detail page
  if ((driveId || selectedDrive) && selectedDrive) {
    return (
      <>
        {/* Drive Detail View - Full Page */}
        <DriveDetailView
          drive={selectedDrive}
          onClose={() => {
            setSelectedDrive(null);
            navigate('/drives');
          }}
          onSave={handleSave}
          userId={user?.id}
        />
        {/* Create Modal */}
        {showCreateModal && (
          <CreateDriveModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchDrives}
          />
        )}
      </>
    );
  }

  // Otherwise, show the drives list
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Placement Drives</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Upcoming placement opportunities</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {user?.role === 'faculty' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-amber-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-amber-600 transition text-sm sm:text-base flex-1 sm:flex-initial justify-center"
            >
              <FaPlus />
              <span>Post Drive</span>
            </button>
          )}
        </div>
      </div>
      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        showDomain={false}
        departments={availableDepartments.length > 0 ? availableDepartments : null}
        years={availableYears.length > 0 ? availableYears : null}
      />

      {/* Status Filter Options */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => setFilters({ ...filters, status: undefined })}
          className={`px-3 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm flex-1 sm:flex-initial ${
            !filters.status || filters.status === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Active / Upcoming
        </button>
        <button
          onClick={() => setFilters({ ...filters, status: 'completed' })}
          className={`px-3 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm flex-1 sm:flex-initial ${
            filters.status === 'completed'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Completed
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
      ) : drives.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No active drives found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {drives.map((drive, index) => {
            const isOwner = drive.postedBy?._id === user?.id || drive.postedBy === user?.id;
            const shortDescription = drive.description?.length > 100 
              ? drive.description.substring(0, 100) + '...' 
              : drive.description;
            
            return (
              <motion.div
                key={drive._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg cursor-pointer p-6 sm:p-8 border border-transparent hover:border-amber-300 h-full flex flex-col"
                onClick={() => navigate(`/drives/${drive._id}`)}
              >
                {/* Header with Title and Actions */}
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 hover:text-amber-600 transition flex-1">
                    {drive.title || drive.company}
                  </h3>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(drive._id);
                      }}
                      className={`p-1.5 sm:p-2 min-w-[32px] min-h-[32px] flex items-center justify-center ${
                        (Array.isArray(drive.likes) && drive.likes.some(likeId => likeId === user?.id || likeId.toString() === user?.id?.toString())) || drive._isSaved
                          ? 'text-amber-600' 
                          : 'text-gray-400'
                      } hover:text-amber-600 transition`}
                    >
                      <FaBookmark size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    {isOwner && (
                      <div className="relative flex flex-col items-end">
                        {confirmingDeleteDrive === drive._id && (
                          <div className="flex items-center gap-2 mb-1 -mt-2">
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  await driveAPI.delete(drive._id);
                                  setConfirmingDeleteDrive(null);
                                  addNotification({
                                    type: 'success',
                                    message: 'Drive deleted successfully!',
                                  });
                                  fetchDrives();
                                } catch (error) {
                                  addNotification({
                                    type: 'error',
                                    message: 'Failed to delete drive',
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
                                setConfirmingDeleteDrive(null);
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
                            if (confirmingDeleteDrive !== drive._id) {
                              setConfirmingDeleteDrive(drive._id);
                            }
                          }}
                          disabled={confirmingDeleteDrive === drive._id}
                          className="p-1.5 sm:p-2 text-red-600 rounded-lg transition-all min-w-[32px] min-h-[32px] flex items-center justify-center hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          title="Delete drive"
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="text-base sm:text-lg transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Company and Job Role */}
                <p className="text-amber-600 font-medium mb-1 sm:mb-2 text-sm sm:text-base">{drive.company}</p>
                <p className="text-gray-700 font-medium mb-2 sm:mb-3 text-sm sm:text-base">{drive.jobRole}</p>

                {/* Description */}
                <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">{shortDescription}</p>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm mt-auto">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-600">
                    <FaMoneyBillWave className="text-green-500 text-xs sm:text-sm flex-shrink-0" />
                    <span className="font-medium break-words">{drive.package}</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-600">
                    <FaCalendarAlt className="text-amber-500 text-xs sm:text-sm flex-shrink-0" />
                    <span className="break-words">{formatDate(drive.driveDate)}</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-600">
                    <FaMapMarkerAlt className="text-red-500 text-xs sm:text-sm flex-shrink-0" />
                    <span className="break-words">{drive.location}</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-600">
                    <FaGraduationCap className="text-amber-500 text-xs sm:text-sm flex-shrink-0" />
                    <span>CGPA: {drive.cgpaCriteria || 0}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateDriveModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchDrives}
        />
      )}
    </div>
  );
};

const DriveDetailView = ({ drive, onClose, onSave, userId }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useAuth();
  const isSaved = Array.isArray(drive.likes) && drive.likes.some(likeId => 
    likeId === userId || likeId.toString() === userId?.toString()
  );
  const isOwner = drive.postedBy?._id === user?.id || drive.postedBy === user?.id;
  const isRegistrationClosed = new Date(drive.registrationDeadline) < new Date();
  const isDriveCompleted = new Date(drive.driveDate) < new Date();

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
            <span>Back to Drives</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-transparent rounded-lg p-4 sm:p-6 md:p-8 lg:p-10">
            {/* Completed Drive Banner */}
            {isDriveCompleted && (
              <div className="mb-6 bg-gray-800 text-white rounded-lg p-4 flex items-center space-x-3">
                <FaCalendarAlt className="text-2xl" />
                <div>
                  <h4 className="font-semibold">Drive Completed</h4>
                  <p className="text-sm text-gray-300">This placement drive has been completed.</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-8">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                      {drive.title || 'Placement Drive'}
                    </h2>
                    {isOwner && (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                        title="Edit drive"
                        type="button"
                      >
                        <FaEdit className="text-base sm:text-lg" />
                      </button>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl text-amber-600 font-semibold">
                    {drive.company}
                  </p>
                  <p className="text-xl text-gray-700 mt-1">
                    {drive.jobRole}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(drive._id);
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

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-green-600 mb-1">
                    <FaMoneyBillWave className="text-xs sm:text-sm" />
                    <span className="text-xs font-medium">Package</span>
                  </div>
                  <p className="font-bold text-gray-900 text-lg">{drive.package}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-amber-600 mb-1">
                    <FaCalendarAlt />
                    <span className="text-xs font-medium">Drive Date</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatDate(drive.driveDate)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-red-600 mb-1">
                    <FaMapMarkerAlt />
                    <span className="text-xs font-medium">Location</span>
                  </div>
                  <p className="font-semibold text-gray-900">{drive.location}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-purple-600 mb-1">
                    <FaGraduationCap />
                    <span className="text-xs font-medium">Min CGPA</span>
                  </div>
                  <p className="font-bold text-gray-900 text-lg">{drive.cgpaCriteria || 0}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="my-6" />

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Job Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                {drive.description}
              </p>
            </div>

            {/* Requirements */}
            {drive.requirements && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Additional Requirements</h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                  {drive.requirements}
                </p>
              </div>
            )}

            {/* Eligibility */}
            <div className="mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Eligibility</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Departments */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Eligible Departments:</p>
                  <div className="flex flex-wrap gap-2">
                    {drive.department?.map((dept) => (
                      <span
                        key={dept}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Years */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Eligible Years:</p>
                  <div className="flex flex-wrap gap-2">
                    {drive.eligibleYears?.map((year) => (
                      <span
                        key={year}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium"
                      >
                        Year {year}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Deadline Info */}
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Registration Deadline:</strong> {formatDate(drive.registrationDeadline)}
              </p>
            </div>

            {/* Divider */}
            <hr className="my-6" />

            {/* Register Button */}
            <div className="flex flex-col items-center">
              {isDriveCompleted ? (
                <div className="text-center">
                  <button
                    disabled
                    className="inline-flex items-center space-x-2 bg-gray-500 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg cursor-not-allowed opacity-75"
                  >
                    <span>Drive Completed</span>
                  </button>
                  <p className="mt-2 text-sm text-gray-600">
                    This drive has already taken place
                  </p>
                </div>
              ) : isRegistrationClosed ? (
                <div className="text-center">
                  <button
                    disabled
                    className="inline-flex items-center space-x-2 bg-gray-400 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg cursor-not-allowed opacity-75"
                  >
                    <span>Registration Closed</span>
                  </button>
                  <p className="mt-2 text-sm text-red-600">
                    Registration deadline has passed
                  </p>
                </div>
              ) : (
                <a
                  href={drive.registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-amber-500 text-white px-8 py-4 rounded-lg hover:bg-amber-600 transition font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  <span>Register Now</span>
                  <FaExternalLinkAlt />
                </a>
              )}
            </div>

          {/* Posted By */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Posted by {drive.postedBy?.name} • {drive.postedBy?.department}
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && (
        <EditDriveModal
          drive={drive}
          onClose={() => setShowEditModal(false)}
          onSuccess={async () => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

const CreateDriveModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    jobRole: '',
    package: '',
    eligibleYears: [],
    cgpaCriteria: '',
    description: '',
    driveDate: '',
    registrationDeadline: '',
    location: '',
    registrationLink: '',
    department: [],
    requirements: '',
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
    
    // Validate at least one department and year is selected
    if (formData.department.length === 0) {
      addNotification({
        type: 'error',
        message: 'Please select at least one eligible department',
      });
      return;
    }
    
    if (formData.eligibleYears.length === 0) {
      addNotification({
        type: 'error',
        message: 'Please select at least one eligible year',
      });
      return;
    }
    
    try {
      setLoading(true);
      await driveAPI.create(formData);
      addNotification({
        type: 'success',
        message: 'Drive posted successfully!',
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating drive:', error);
      addNotification({
        type: 'error',
        message: error?.message || 'Failed to post drive',
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
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-10 text-amber-900">Post Placement Drive</h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
              placeholder="e.g., Campus Placement Drive 2024"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., Google, Microsoft"
              />
            </div>

            {/* Job Role */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Job Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.jobRole}
                onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., Software Engineer"
              />
            </div>

            {/* Package */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Package <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.package}
                onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., ₹12 LPA"
              />
            </div>

            {/* CGPA Criteria */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                CGPA Criteria <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cgpaCriteria}
                onChange={(e) => setFormData({ ...formData, cgpaCriteria: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., 7.0"
              />
            </div>

            {/* Drive Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Drive Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.driveDate}
                onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>

            {/* Registration Deadline */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Registration Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
                placeholder="e.g., On-Campus / Bangalore"
              />
            </div>

            {/* Title for alignment */}
            <div></div>
          </div>

          {/* Eligible Years */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Eligible Years <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((year) => (
                <label key={year} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eligibleYears.includes(year)}
                    onChange={(e) => {
                      const years = e.target.checked
                        ? [...formData.eligibleYears, year]
                        : formData.eligibleYears.filter(y => y !== year);
                      setFormData({ ...formData, eligibleYears: years });
                    }}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm">Year {year}</span>
                </label>
              ))}
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
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-2 focus:border-amber-500 bg-amber-50 resize-y focus:outline-none"
              placeholder="Describe the job role, process, and requirements..."
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
              Additional Requirements (Optional)
            </label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={2}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-2 focus:border-amber-500 bg-amber-50 resize-y focus:outline-none"
              placeholder="Any additional eligibility criteria..."
            />
          </div>

          {/* Registration Link */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
              Registration Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.registrationLink}
              onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
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
                'Post Drive'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const EditDriveModal = ({ drive, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: drive.title || '',
    company: drive.company || '',
    jobRole: drive.jobRole || '',
    package: drive.package || '',
    eligibleYears: drive.eligibleYears || [],
    cgpaCriteria: drive.cgpaCriteria || '',
    description: drive.description || '',
    driveDate: drive.driveDate ? new Date(drive.driveDate).toISOString().split('T')[0] : '',
    registrationDeadline: drive.registrationDeadline ? new Date(drive.registrationDeadline).toISOString().split('T')[0] : '',
    location: drive.location || '',
    registrationLink: drive.registrationLink || '',
    department: drive.department || [],
    requirements: drive.requirements || '',
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
    
    if (formData.department.length === 0) {
      addNotification({
        type: 'error',
        message: 'Please select at least one eligible department',
      });
      return;
    }
    
    if (formData.eligibleYears.length === 0) {
      addNotification({
        type: 'error',
        message: 'Please select at least one eligible year',
      });
      return;
    }
    
    try {
      setLoading(true);
      await driveAPI.update(drive._id, formData);
      addNotification({
        type: 'success',
        message: 'Drive updated successfully!',
      });
      onSuccess();
      onClose();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to update drive',
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
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-amber-100 rounded-full transition-colors z-10"
          title="Close"
        >
          <FaTimes className="text-lg" />
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-10 text-amber-900">Edit Placement Drive</h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Job Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.jobRole}
                onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Package <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.package}
                onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                CGPA Criteria <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cgpaCriteria}
                onChange={(e) => setFormData({ ...formData, cgpaCriteria: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Drive Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.driveDate}
                onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Registration Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
              />
            </div>
            <div></div>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Eligible Years <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((year) => (
                <label key={year} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eligibleYears.includes(year)}
                    onChange={(e) => {
                      const years = e.target.checked
                        ? [...formData.eligibleYears, year]
                        : formData.eligibleYears.filter(y => y !== year);
                      setFormData({ ...formData, eligibleYears: years });
                    }}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm">Year {year}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Eligible Departments <span className="text-red-500">*</span>
            </label>
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
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-2 focus:border-amber-500 bg-amber-50 resize-y focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
              Additional Requirements (Optional)
            </label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={2}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-2 focus:border-amber-500 bg-amber-50 resize-y focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-amber-900">
              Registration Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.registrationLink}
              onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-0 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border focus:border-amber-300 bg-amber-50 focus:outline-none"
            />
          </div>
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
                'Update Drive'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Drives;

