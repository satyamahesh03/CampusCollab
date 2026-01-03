import { useState, useEffect } from 'react';
import { driveAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { formatDate, departments } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaBookmark, FaTrash, FaTimes, FaExternalLinkAlt, FaCalendarAlt, FaMapMarkerAlt, FaMoneyBillWave, FaBriefcase, FaGraduationCap, FaArrowLeft } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';

const Drives = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const { user } = useAuth();
  const { addNotification, refreshReminders } = useGlobal();
  const { id: driveId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (driveId) {
      fetchSingleDrive(driveId);
    } else {
      // Clear selected drive when navigating back (browser back button)
      setSelectedDrive(null);
    }
  }, [driveId]);

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
      setDrives(response.data);
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
      const drive = drives.find(d => d._id === id);
      if (!drive) {
        addNotification({ 
          type: 'error', 
          message: 'Drive not found' 
        });
        return;
      }

      const wasSaved = drive.likes?.some(likeId => 
        likeId === user.id || likeId.toString() === user.id?.toString()
      );
      
      await driveAPI.like(id);
      
      addNotification({ 
        type: 'success', 
        message: wasSaved ? 'Removed from reminders!' : 'Saved to reminders!' 
      });
      
      fetchDrives();
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
      <FilterBar filters={filters} setFilters={setFilters} showDomain={false} />

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
        <Loading />
      ) : drives.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No active drives found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="bg-white/60 backdrop-blur-sm rounded-lg transition-all duration-300 cursor-pointer p-4 sm:p-6 border border-amber-100/50 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1"
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
                        drive.likes?.some(likeId => likeId === user?.id || likeId.toString() === user?.id?.toString())
                          ? 'text-amber-600' 
                          : 'text-gray-400'
                      } hover:text-amber-600 transition`}
                    >
                      <FaBookmark size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    {isOwner && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm('Are you sure you want to delete this drive?')) return;
                          
                          try {
                            await driveAPI.delete(drive._id);
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
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Delete drive"
                      >
                        <FaTrash size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Company and Job Role */}
                <p className="text-amber-600 font-medium mb-1 sm:mb-2 text-sm sm:text-base">{drive.company}</p>
                <p className="text-gray-700 font-medium mb-2 sm:mb-3 text-sm sm:text-base">{drive.jobRole}</p>

                {/* Description */}
                <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">{shortDescription}</p>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
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
  const isSaved = drive.likes?.some(likeId => 
    likeId === userId || likeId.toString() === userId?.toString()
  );
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
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {drive.title || 'Placement Drive'}
                  </h2>
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
                  className={`p-3 rounded-full transition ${
                    isSaved
                      ? 'bg-primary-100 text-amber-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative"
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
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-10">Post Placement Drive</h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., Campus Placement Drive 2024"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="e.g., Google, Microsoft"
              />
            </div>

            {/* Job Role */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Job Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.jobRole}
                onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="e.g., Software Engineer"
              />
            </div>

            {/* Package */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Package <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.package}
                onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="e.g., ₹12 LPA"
              />
            </div>

            {/* CGPA Criteria */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                CGPA Criteria <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cgpaCriteria}
                onChange={(e) => setFormData({ ...formData, cgpaCriteria: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="e.g., 7.0"
              />
            </div>

            {/* Drive Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Drive Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.driveDate}
                onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Registration Deadline */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Registration Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
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
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                {formData.department.map((dept) => (
                  <span
                    key={dept}
                    className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center space-x-2"
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
            <div className="border rounded-lg p-3 sm:p-4 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {departments.map((dept) => (
                  <label
                    key={dept}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 sm:p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.department.includes(dept)}
                      onChange={() => toggleDepartment(dept)}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 flex-shrink-0"
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
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500 resize-y"
              placeholder="Describe the job role, process, and requirements..."
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Additional Requirements (Optional)
            </label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={2}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500 resize-y"
              placeholder="Any additional eligibility criteria..."
            />
          </div>

          {/* Registration Link */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Registration Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.registrationLink}
              onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="https://..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 sm:pt-4">
            <button
              type="submit"
              className="w-full bg-amber-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-amber-600 transition font-medium text-sm sm:text-base"
            >
              Post Drive
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Drives;

