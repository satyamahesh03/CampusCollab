import { useState, useEffect } from 'react';
import { driveAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { formatDate, departments } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaBookmark, FaTrash, FaTimes, FaExternalLinkAlt, FaCalendarAlt, FaMapMarkerAlt, FaMoneyBillWave, FaBriefcase, FaGraduationCap, FaShare, FaArrowLeft } from 'react-icons/fa';
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

  const handleShare = (drive) => {
    const url = `${window.location.origin}/drives/${drive._id}`;
    navigator.clipboard.writeText(url).then(() => {
      addNotification({ type: 'success', message: 'Link copied to clipboard!' });
    }).catch(() => {
      addNotification({ type: 'error', message: 'Failed to copy link' });
    });
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          {(driveId || selectedDrive) && (
            <button
              onClick={() => {
                setSelectedDrive(null);
                navigate('/drives');
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
            >
              <FaArrowLeft />
              <span>Back to Drives</span>
            </button>
          )}
          {!(driveId || selectedDrive) && (
            <div>
              <h1 className="text-3xl font-bold">Placement Drives</h1>
              <p className="text-gray-600 mt-1">Upcoming placement opportunities</p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {(driveId || selectedDrive) && (
            <button
              onClick={() => handleShare(selectedDrive)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <FaShare />
              <span>Share</span>
            </button>
          )}
          {user?.role === 'faculty' && !(driveId || selectedDrive) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
            >
              <FaPlus />
              <span>Post Drive</span>
            </button>
          )}
        </div>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} showDomain={false} />

      {/* Status Filter Options */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setFilters({ ...filters, status: undefined })}
          className={`px-4 py-2 rounded-lg transition ${
            !filters.status || filters.status === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Active / Upcoming
        </button>
        <button
          onClick={() => setFilters({ ...filters, status: 'completed' })}
          className={`px-4 py-2 rounded-lg transition ${
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
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer p-6"
                onClick={() => navigate(`/drives/${drive._id}`)}
              >
                {/* Header with Title and Actions */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 hover:text-primary-600 transition flex-1">
                    {drive.title || drive.company}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(drive._id);
                      }}
                      className={`p-2 ${
                        drive.likes?.some(likeId => likeId === user?.id || likeId.toString() === user?.id?.toString())
                          ? 'text-primary-600' 
                          : 'text-gray-400'
                      } hover:text-primary-600 transition`}
                    >
                      <FaBookmark size={20} />
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
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete drive"
                      >
                        <FaTrash size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Company and Job Role */}
                <p className="text-primary-600 font-medium mb-2">{drive.company}</p>
                <p className="text-gray-700 font-medium mb-3">{drive.jobRole}</p>

                {/* Description */}
                <p className="text-gray-600 mb-4 text-sm">{shortDescription}</p>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FaMoneyBillWave className="text-green-500" />
                    <span className="font-medium">{drive.package}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FaCalendarAlt className="text-blue-500" />
                    <span>{formatDate(drive.driveDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FaMapMarkerAlt className="text-red-500" />
                    <span>{drive.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FaGraduationCap className="text-purple-500" />
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

      {selectedDrive && (
        <DriveDetailView
          drive={selectedDrive}
          onClose={() => {
            setSelectedDrive(null);
            navigate('/drives');
          }}
          onSave={handleSave}
          userId={user?.id}
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
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg w-full max-w-4xl my-8 relative"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition z-10"
          >
            <FaTimes className="text-xl text-gray-600" />
          </button>

          {/* Content */}
          <div className="p-8 max-h-[85vh] overflow-y-auto">
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
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {drive.title || 'Placement Drive'}
                  </h2>
                  <p className="text-2xl text-primary-600 font-semibold">
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
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FaBookmark size={24} />
                </button>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-green-600 mb-1">
                    <FaMoneyBillWave />
                    <span className="text-xs font-medium">Package</span>
                  </div>
                  <p className="font-bold text-gray-900 text-lg">{drive.package}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-blue-600 mb-1">
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

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {drive.description}
              </p>
            </div>

            {/* Requirements */}
            {drive.requirements && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Requirements</h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {drive.requirements}
                </p>
              </div>
            )}

            {/* Eligibility */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Eligibility</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Departments */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Eligible Departments:</p>
                  <div className="flex flex-wrap gap-2">
                    {drive.department?.map((dept) => (
                      <span
                        key={dept}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
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
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
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
                  className="inline-flex items-center space-x-2 bg-primary-600 text-white px-8 py-4 rounded-lg hover:bg-primary-700 transition font-semibold text-lg shadow-lg hover:shadow-xl"
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
        </motion.div>
      </div>
    </AnimatePresence>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold mb-6">Post Placement Drive</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Campus Placement Drive 2024"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Google, Microsoft"
              />
            </div>

            {/* Job Role */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Job Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.jobRole}
                onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Software Engineer"
              />
            </div>

            {/* Package */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Package <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.package}
                onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., ₹12 LPA"
              />
            </div>

            {/* CGPA Criteria */}
            <div>
              <label className="block text-sm font-medium mb-2">
                CGPA Criteria <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cgpaCriteria}
                onChange={(e) => setFormData({ ...formData, cgpaCriteria: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 7.0"
              />
            </div>

            {/* Drive Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Drive Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.driveDate}
                onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Registration Deadline */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Registration Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., On-Campus / Bangalore"
              />
            </div>

            {/* Title for alignment */}
            <div></div>
          </div>

          {/* Eligible Years */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Eligible Years <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              {[1, 2, 3, 4].map((year) => (
                <label key={year} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.eligibleYears.includes(year)}
                    onChange={(e) => {
                      const years = e.target.checked
                        ? [...formData.eligibleYears, year]
                        : formData.eligibleYears.filter(y => y !== year);
                      setFormData({ ...formData, eligibleYears: years });
                    }}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span>Year {year}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Eligible Departments <span className="text-red-500">*</span>
            </label>
            
            {/* Selected Departments Display */}
            {formData.department.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                {formData.department.map((dept) => (
                  <span
                    key={dept}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center space-x-2"
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
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {departments.map((dept) => (
                  <label
                    key={dept}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.department.includes(dept)}
                      onChange={() => toggleDepartment(dept)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{dept}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select all applicable departments</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Describe the job role, process, and requirements..."
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Additional Requirements (Optional)
            </label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Any additional eligibility criteria..."
            />
          </div>

          {/* Registration Link */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Registration Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.registrationLink}
              onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="https://..."
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition font-medium"
            >
              Post Drive
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

export default Drives;

