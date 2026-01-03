import { useState, useEffect } from 'react';
import { hackathonAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { formatDate, getDomainColor, domains, departments } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaBookmark, FaTrash, FaTimes, FaExternalLinkAlt, FaCalendarAlt, FaMapMarkerAlt, FaTrophy, FaClock, FaArrowLeft } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';

const Hackathons = () => {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const { user } = useAuth();
  const { addNotification, refreshReminders } = useGlobal();
  const { id: hackathonId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (hackathonId) {
      fetchSingleHackathon(hackathonId);
    } else {
      // Clear selected hackathon when navigating back (browser back button)
      setSelectedHackathon(null);
    }
  }, [hackathonId]);

  useEffect(() => {
    if (!hackathonId) {
      fetchHackathons();
    }
  }, [filters, hackathonId]);

  const fetchSingleHackathon = async (id) => {
    try {
      setLoading(true);
      const response = await hackathonAPI.getById(id);
      setSelectedHackathon(response.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Hackathon not found' });
      navigate('/hackathons');
    } finally {
      setLoading(false);
    }
  };

  const fetchHackathons = async () => {
    try {
      setLoading(true);
      const response = await hackathonAPI.getAll(filters);
      setHackathons(response.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to fetch hackathons' });
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async (id, e) => {
    if (e) e.stopPropagation();
    
    if (!user) {
      addNotification({ 
        type: 'error', 
        message: 'Please login to save hackathons' 
      });
      return;
    }
    
    // Find the hackathon and check if it's already saved BEFORE the API call
    const hackathon = hackathons.find(h => h._id === id);
    if (!hackathon) {
      addNotification({ 
        type: 'error', 
        message: 'Hackathon not found' 
      });
      return;
    }

    // Check if already saved by comparing user ID with likes array
    const wasSaved = hackathon.likes?.some(likeId => 
      likeId === user.id || likeId.toString() === user.id?.toString()
    );
    
    try {
      // Make the API call
      await hackathonAPI.like(id);
      
      // Show success notification immediately
      addNotification({ 
        type: 'success', 
        message: wasSaved ? 'Removed from reminders!' : 'Saved to reminders!' 
      });
      
      // Refresh the hackathons list
      fetchHackathons();
      
      // Refresh reminders in GlobalContext
      refreshReminders();
    } catch (error) {
      console.error('Error saving hackathon:', error);
      addNotification({ 
        type: 'error', 
        message: error?.message || 'Failed to update hackathon' 
      });
    }
  };

  // If viewing a specific hackathon, show only the hackathon detail page
  if ((hackathonId || selectedHackathon) && selectedHackathon) {
    return (
      <>
        {/* Hackathon Detail View - Full Page */}
        <HackathonDetailView
          hackathon={selectedHackathon}
          onClose={() => {
            setSelectedHackathon(null);
            navigate('/hackathons');
          }}
          onSave={handleSave}
          userId={user?.id}
        />
        {/* Create Modal */}
        {showCreateModal && (
          <CreateHackathonModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchHackathons}
          />
        )}
      </>
    );
  }

  // Otherwise, show the hackathons list
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Hackathons</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Discover and participate in hackathons</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {(user?.role === 'student' || user?.role === 'faculty') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-amber-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-amber-600 transition text-sm sm:text-base flex-1 sm:flex-initial justify-center"
            >
              <FaPlus />
              <span>Post Hackathon</span>
            </button>
          )}
        </div>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} showYear={false} showDepartment={false} />
      
      {loading ? (
        <Loading />
      ) : hackathons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No hackathons found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hackathons.map((hackathon, index) => {
            const isOwner = hackathon.postedBy?._id === user?.id || hackathon.postedBy === user?.id;
            const timePeriod = `${formatDate(hackathon.startDate)} - ${formatDate(hackathon.endDate)}`;
            
            return (
              <motion.div
                key={hackathon._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/60 backdrop-blur-sm rounded-lg transition-all duration-300 cursor-pointer p-4 sm:p-6 border border-amber-100/50 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1"
                onClick={() => navigate(`/hackathons/${hackathon._id}`)}
              >
                {/* Header with Title and Actions */}
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 hover:text-amber-600 transition flex-1">
                    {hackathon.title}
                  </h3>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleSave(hackathon._id, e)}
                      className={`p-1.5 sm:p-2 min-w-[32px] min-h-[32px] flex items-center justify-center ${
                        hackathon.likes?.some(likeId => likeId === user?.id || likeId.toString() === user?.id?.toString())
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
                          if (!window.confirm('Are you sure you want to delete this hackathon?')) return;
                          
                          try {
                            await hackathonAPI.delete(hackathon._id);
                            addNotification({
                              type: 'success',
                              message: 'Hackathon deleted successfully!',
                            });
                            fetchHackathons();
                          } catch (error) {
                            addNotification({
                              type: 'error',
                              message: 'Failed to delete hackathon',
                            });
                          }
                        }}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Delete hackathon"
                      >
                        <FaTrash size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Organizer */}
                <p className="text-amber-600 font-medium mb-2 sm:mb-3 text-sm sm:text-base">{hackathon.organizer}</p>

                {/* Domain Badge */}
                <div className="mb-2 sm:mb-3">
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getDomainColor(hackathon.domain)}`}>
                    {hackathon.domain}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <FaCalendarAlt className="text-gray-400 text-xs sm:text-sm flex-shrink-0" />
                    <span className="break-words">{timePeriod}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <FaMapMarkerAlt className="text-gray-400 text-xs sm:text-sm flex-shrink-0" />
                    <span className="break-words">{hackathon.location} • {hackathon.mode}</span>
                  </div>
                  {hackathon.prizes && (
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <FaTrophy className="text-yellow-500 text-xs sm:text-sm flex-shrink-0" />
                      <span className="font-medium text-gray-900 break-words">{hackathon.prizes}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateHackathonModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchHackathons}
        />
      )}
    </div>
  );
};

const HackathonDetailView = ({ hackathon, onClose, onSave, userId }) => {
  const isSaved = hackathon.likes?.some(likeId => 
    likeId === userId || likeId.toString() === userId?.toString()
  );
  const isRegistrationClosed = new Date(hackathon.registrationDeadline) < new Date();

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
            <span>Back to Hackathons</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-transparent rounded-lg p-4 sm:p-6 md:p-8 lg:p-10">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                <div className="flex-1 pr-0 sm:pr-8">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {hackathon.title}
                  </h2>
                  <p className="text-lg sm:text-xl text-amber-600 font-semibold">
                    Organized by {hackathon.organizer}
                  </p>
                </div>
                <button
                  onClick={(e) => onSave(hackathon._id, e)}
                  className={`p-3 rounded-full transition ${
                    isSaved
                      ? 'bg-primary-100 text-amber-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FaBookmark size={24} />
                </button>
              </div>

              {/* Domain Badge */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDomainColor(hackathon.domain)}`}>
                  {hackathon.domain}
                </span>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 mb-1">
                    <FaCalendarAlt className="text-xs sm:text-sm" />
                    <span className="text-xs font-medium">Event Period</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {formatDate(hackathon.startDate)}
                  </p>
                  <p className="text-xs text-gray-600">to</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {formatDate(hackathon.endDate)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 mb-1">
                    <FaMapMarkerAlt className="text-xs sm:text-sm" />
                    <span className="text-xs font-medium">Location</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">{hackathon.location}</p>
                  <p className="text-xs text-gray-600 capitalize">{hackathon.mode}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 mb-1">
                    <FaClock className="text-xs sm:text-sm" />
                    <span className="text-xs font-medium">Register By</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                    {formatDate(hackathon.registrationDeadline)}
                  </p>
                </div>
              </div>

              {/* Prizes */}
              {hackathon.prizes && (
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaTrophy className="text-yellow-600 text-xl" />
                    <h3 className="font-semibold text-gray-900">Prize Pool</h3>
                  </div>
                  <p className="text-gray-800 font-medium">{hackathon.prizes}</p>
                </div>
              )}
            </div>

          {/* Divider */}
          <hr className="my-6" />

          {/* Description */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">About this Hackathon</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
              {hackathon.description}
            </p>
          </div>

          {/* Divider */}
          <hr className="my-6" />

          {/* Register Button */}
          <div className="flex flex-col items-center">
            {isRegistrationClosed ? (
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
                href={hackathon.registrationLink}
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
            Posted by {hackathon.postedBy?.name} • {hackathon.postedBy?.department}
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateHackathonModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    description: '',
    location: '',
    registrationLink: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    mode: '',
    domain: '',
    prizes: '',
  });
  const { addNotification } = useGlobal();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await hackathonAPI.create(formData);
      addNotification({
        type: 'success',
        message: 'Hackathon posted successfully!',
      });
      onSuccess();
      onClose();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to post hackathon',
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
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-10">Post Hackathon</h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
                placeholder="e.g., Smart India Hackathon 2024"
              />
            </div>

            {/* Organizer */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Organizer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.organizer}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Organization name"
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
                placeholder="City or Online"
              />
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select Mode</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Domain <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select Domain</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
              placeholder="Describe the hackathon theme, rules, and requirements..."
            />
          </div>

          {/* Prizes */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Prizes (Optional)</label>
            <input
              type="text"
              value={formData.prizes}
              onChange={(e) => setFormData({ ...formData, prizes: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., 1st Prize: ₹1,00,000, 2nd Prize: ₹50,000"
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
              Post Hackathon
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Hackathons;

