import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, chatAPI, projectAPI } from '../utils/api';
import { getRoleColor, departments } from '../utils/helpers';
import { useGlobal } from '../context/GlobalContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Camera, Mail, BookOpen, Edit2, Save, X, Plus, Trash2, Upload, Check, AlertCircle, Image as ImageIcon, ArrowLeft, MessageCircle, Globe } from 'lucide-react';
import Loading from '../components/Loading';

const Profile = () => {
  const { user, setUser } = useAuth();
  const { addNotification } = useGlobal();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userIdParam = searchParams.get('userId');
  const [viewedUser, setViewedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [imageInfo, setImageInfo] = useState({ name: '', size: '', type: '' });
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    year: '',
    rollNumber: '',
    skills: [],
    profilePicture: '',
    bio: '',
    websiteUrl: '',
    designation: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [showImageUploadHelp, setShowImageUploadHelp] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [joinedProjects, setJoinedProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Determine if viewing another user's profile
  const isViewingOtherUser = userIdParam && userIdParam !== user?.id;
  const displayUser = isViewingOtherUser ? viewedUser : user;

  // Fetch other user's profile if viewing someone else
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isViewingOtherUser) {
        try {
          setFetchingProfile(true);
          const response = await authAPI.getUserProfile(userIdParam);
          console.log('Fetched user profile:', response);
          // Handle both response.user and response.data formats
          const userData = response.user || response.data || response;
          console.log('Setting viewedUser:', userData);
          setViewedUser(userData);
        } catch (error) {
          addNotification({
            type: 'error',
            message: error?.message || 'Failed to load user profile'
          });
        } finally {
          setFetchingProfile(false);
        }
      } else {
        setViewedUser(null);
      }
    };

    fetchUserProfile();
  }, [userIdParam, user?.id, isViewingOtherUser]);

  useEffect(() => {
    const loadProjects = async () => {
      const targetUserId = displayUser?.id || displayUser?._id;
      if (!targetUserId || displayUser?.role !== 'student') return;
      try {
        setProjectsLoading(true);
        const response = await projectAPI.getByUser(targetUserId);
        // response success and data under data
        setJoinedProjects(response.data || []);
      } catch (error) {
        addNotification({
          type: 'error',
          message: 'Failed to load projects'
        });
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
  }, [displayUser]);

  useEffect(() => {
    if (user && !isViewingOtherUser) {
      setFormData({
        name: user.name || '',
        department: user.department || '',
        year: user.year || '',
        rollNumber: user.rollNumber || '',
        skills: user.skills || [],
        profilePicture: user.profilePicture || '',
        bio: user.bio || '',
        websiteUrl: user.websiteUrl || '',
        designation: user.designation || ''
      });
      setImagePreview(user.profilePicture || '');
      if (user.profilePicture) {
        // Calculate approximate size for existing base64 images
        const sizeInBytes = (user.profilePicture.length * 3) / 4;
        setImageInfo({
          name: 'Current Profile Picture',
          size: formatFileSize(sizeInBytes),
          type: 'image'
        });
      }
    }
  }, [user, isViewingOtherUser]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Capitalize name (first letter of each word)
    if (name === 'name') {
      processedValue = value.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        addNotification({
          type: 'error',
          title: 'Invalid File Type',
          message: 'Please select an image file (JPG, PNG, GIF, etc.)'
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addNotification({
          type: 'error',
          title: 'File Too Large',
          message: `Image size is ${formatFileSize(file.size)}. Please select an image smaller than 5MB.`
        });
        return;
      }

      try {
        // Show loading notification
        addNotification({
          type: 'info',
          title: 'Processing Image',
          message: 'Compressing image for optimal upload...'
        });

        // Compress the image
        const compressedBase64 = await compressImage(file, 800, 0.8);

        // Calculate compressed size
        const compressedSize = Math.round((compressedBase64.length * 3) / 4);

        // Set image info
        setImageInfo({
          name: file.name,
          size: formatFileSize(compressedSize),
          type: 'image/jpeg'
        });

        // Set preview and form data
        setImagePreview(compressedBase64);
        setFormData(prev => ({ ...prev, profilePicture: compressedBase64 }));

        addNotification({
          type: 'success',
          title: 'Image Ready',
          message: `${file.name} compressed to ${formatFileSize(compressedSize)} and ready to upload`
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Image Processing Failed',
          message: 'Failed to process the image. Please try a different image.'
        });
      }
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setImageInfo({ name: '', size: '', type: '' });
    setFormData(prev => ({ ...prev, profilePicture: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    addNotification({
      type: 'success',
      title: 'Image Removed',
      message: 'Profile picture has been removed'
    });
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      if (formData.skills.length >= 10) {
        addNotification({
          type: 'error',
          title: 'Skill Limit Reached',
          message: 'You can add up to 10 skills'
        });
        return;
      }
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    } else if (formData.skills.includes(newSkill.trim())) {
      addNotification({
        type: 'error',
        title: 'Duplicate Skill',
        message: 'This skill is already added'
      });
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate name
    if (!formData.name.trim()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Name is required'
      });
      return;
    }

    // Validate department
    if (!formData.department) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Department is required'
      });
      return;
    }

    // Validate year for students
    if (user.role === 'student' && !formData.year) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Year of study is required'
      });
      return;
    }

    // Validate roll number for students (10 alphanumeric characters)
    if (user.role === 'student' && formData.rollNumber) {
      if (!/^[A-Z0-9]{10}$/.test(formData.rollNumber)) {
        addNotification({
          type: 'error',
          title: 'Validation Error',
          message: 'Roll number must be exactly 10 characters'
        });
        return;
      }
    }

    // Validate bio length
    if (formData.bio.length > 300) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'About section cannot exceed 300 characters'
      });
      return;
    }

    // Validate website URL for students
    if (user.role === 'student' && formData.websiteUrl && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a valid URL starting with http:// or https://'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.updateProfile(formData);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      addNotification({
        type: 'success',
        title: 'Profile Updated!',
        message: 'Your profile has been updated successfully'
      });
      setIsEditing(false);
      setShowImageUploadHelp(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error?.message || 'Failed to update profile. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!isViewingOtherUser || !viewedUser) {
      addNotification({ type: 'error', message: 'Unable to start chat. Please try again.' });
      return;
    }

    setMessageLoading(true);

    try {
      // Use userIdParam as fallback if viewedUser._id is not available
      const targetUserId = viewedUser._id || userIdParam;
      if (!targetUserId) {
        addNotification({ type: 'error', message: 'User ID not found. Please try again.' });
        return;
      }

      // Get or create chat with this user
      const response = await chatAPI.getChat(targetUserId);
      // Navigate to the chat
      navigate(`/chats/${response.data._id}`);
    } catch (error) {
      console.error('Message error:', error);
      addNotification({ type: 'error', message: 'Failed to open chat' });
    } finally {
      setMessageLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current user data
    setFormData({
      name: user.name || '',
      department: user.department || '',
      year: user.year || '',
      rollNumber: user.rollNumber || '',
      skills: user.skills || [],
      profilePicture: user.profilePicture || '',
      bio: user.bio || '',
      websiteUrl: user.websiteUrl || '',
      designation: user.designation || ''
    });
    setImagePreview(user.profilePicture || '');
    if (user.profilePicture) {
      const sizeInBytes = (user.profilePicture.length * 3) / 4;
      setImageInfo({
        name: 'Current Profile Picture',
        size: formatFileSize(sizeInBytes),
        type: 'image'
      });
    } else {
      setImageInfo({ name: '', size: '', type: '' });
    }
    setIsEditing(false);
    setShowImageUploadHelp(false);
  };

  if (!user) return null;

  if (fetchingProfile) {
    return <Loading />;
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const bioCharsRemaining = 300 - formData.bio.length;
  const bioPercentage = (formData.bio.length / 300) * 100;

  return (
    <div className="min-h-screen bg-amber-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        {isViewingOtherUser && (
          <button
            onClick={() => window.history.back()}
            className="mb-8 flex items-center space-x-2 text-gray-500 hover:text-amber-700 transition-colors font-medium group"
          >
            <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
              <ArrowLeft size={18} />
            </div>
            <span>Back to Profile</span>
          </button>
        )}

        {/* Modern Open Header Layout */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16">
          {/* Profile Picture */}
          <div className="relative group flex-shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white ring-1 ring-amber-100 relative z-10">
              {(isViewingOtherUser ? displayUser?.profilePicture : imagePreview) ? (
                <img
                  src={isViewingOtherUser ? displayUser?.profilePicture : imagePreview}
                  alt={displayUser?.name || formData.name}
                  className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-110"
                  draggable="false"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-white text-4xl font-bold">
                  {getInitials(displayUser?.name || formData.name || user?.name || 'U')}
                </div>
              )}
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowImageUploadHelp(true);
                }}
                className="absolute bottom-0 right-0 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-black transition-all z-20"
                title="Change Photo"
              >
                <Camera size={18} />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Name & Role Info */}
          <div className="flex-1 min-w-0 text-center md:text-left w-full">
            {isEditing ? (
              <div className="mb-4">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name"
                  className="text-2xl md:text-5xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-300 focus:border-gray-900 outline-none w-full placeholder-gray-300 text-center md:text-left"
                  required
                />
              </div>
            ) : (
              <h1 className="text-2xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
                {capitalizeName(displayUser?.name || '')}
              </h1>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-600">
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold capitalize ${getRoleColor(displayUser?.role)}`}>
                {displayUser?.role}
              </span>
              {(displayUser?.department || formData.department) && (
                <span className="flex items-center gap-2 text-sm md:text-lg">
                  <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  {isEditing ? (
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="bg-transparent border-b border-gray-300 focus:border-gray-900 outline-none py-1"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  ) : (
                    displayUser?.department
                  )}
                </span>
              )}
            </div>

            {/* Academic Details - Simplified Horizontal List */}
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-3 text-gray-500">
              {displayUser?.role === 'student' && (
                <>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">Roll Number</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="rollNumber"
                        value={formData.rollNumber}
                        disabled
                        onChange={(e) => { }}
                        className="font-medium text-gray-500 bg-transparent border-b border-gray-200 cursor-not-allowed outline-none w-32 text-center md:text-left"
                        title="Roll number cannot be changed"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{displayUser?.rollNumber || '-'}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">Year</span>
                    {isEditing ? (
                      <select
                        name="year"
                        value={formData.year}
                        disabled
                        onChange={() => { }}
                        className="font-medium text-gray-500 bg-transparent border-b border-gray-200 cursor-not-allowed outline-none"
                        title="Year cannot be changed"
                      >
                        <option value="">Select</option>
                        <option value="1">1st</option>
                        <option value="2">2nd</option>
                        <option value="3">3rd</option>
                        <option value="4">4th</option>
                      </select>
                    ) : (
                      <span className="font-medium text-gray-900">{displayUser?.year ? `${displayUser.year} Year` : '-'}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
            {isViewingOtherUser ? (
              <button
                onClick={handleMessage}
                className="w-full md:w-auto bg-gray-900 text-white px-8 py-3 rounded-full font-medium shadow-xl hover:bg-black transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <MessageCircle size={20} />
                Message
              </button>
            ) : (
              !isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full md:w-auto bg-white text-gray-900 border-2 border-gray-200 px-8 py-3 rounded-full font-bold hover:border-gray-900 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  Edit Profile
                </button>
              ) : (
                <div className="flex flex-col-reverse md:flex-row gap-3">
                  <button
                    onClick={handleCancel}
                    className="w-full md:w-auto px-6 py-3 rounded-full font-medium text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full md:w-auto bg-gray-900 text-white px-8 py-3 rounded-full font-medium shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Modern Content Grid - No Cards, just clean sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-t border-gray-200 pt-12">

          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-16">

            {/* About Section */}
            <section>
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                About
              </h2>
              {isEditing ? (
                <div className="relative">
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="6"
                    maxLength="300"
                    placeholder="Write a short bio..."
                    className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-gray-900 outline-none text-lg leading-relaxed resize-none transition-all placeholder-gray-300"
                  />
                  <div className="text-right mt-2 text-sm text-gray-400">
                    {formData.bio.length}/300
                  </div>
                </div>
              ) : (
                <p className="text-sm md:text-xl text-gray-600 leading-relaxed font-light">
                  {displayUser?.bio || <span className="text-gray-400 italic">No bio added yet.</span>}
                </p>
              )}
            </section>

            {/* Skills Section */}
            {displayUser?.role === 'student' && (
              <section>
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                  Skills & Expertise
                </h2>

                {isEditing && (
                  <div className="flex gap-4 mb-8">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                      placeholder="Add a skill..."
                      className="flex-1 px-6 py-3 bg-white border-2 border-gray-200 rounded-full focus:border-gray-900 outline-none text-lg"
                    />
                    <button
                      onClick={handleAddSkill}
                      disabled={!newSkill.trim()}
                      className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 transition-all"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {/* Skill Chips */}
                  {(isEditing ? formData.skills : displayUser?.skills || []).map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 md:px-6 md:py-2.5 bg-white border border-amber-200 rounded-full text-amber-900 font-medium text-xs md:text-base hover:border-amber-400 transition-colors flex items-center gap-2 md:gap-3 truncate"
                      style={{ maxWidth: '100%' }}
                    >
                      {skill}
                      {isEditing && (
                        <button onClick={() => handleRemoveSkill(skill)} className="text-amber-500 hover:text-red-500">
                          <X size={16} />
                        </button>
                      )}
                    </span>
                  ))}

                  {(!displayUser?.skills?.length && !isEditing) && (
                    <p className="text-gray-400 italic">No skills listed.</p>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4 space-y-12">

            {/* Contact Info */}
            <section>
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider">Contact</h3>
              <div className="space-y-6">
                <div className="group flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-500 mb-1">Email</p>
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${displayUser?.email}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 font-medium truncate hover:text-amber-600 hover:underline cursor-pointer block"
                      title="Compose email in Gmail"
                    >
                      {displayUser?.email}
                    </a>
                  </div>
                </div>

                {displayUser?.role === 'student' && (
                  <div className="group flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Globe size={18} />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-sm font-semibold text-gray-500 mb-1">Website / Portfolio</p>
                      {isEditing ? (
                        <input
                          type="url"
                          name="websiteUrl"
                          value={formData.websiteUrl}
                          onChange={handleChange}
                          placeholder="https://..."
                          className="w-full bg-transparent border-b border-gray-300 focus:border-black outline-none py-1 text-gray-900"
                        />
                      ) : displayUser?.websiteUrl ? (
                        <a href={displayUser.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-gray-900 font-medium hover:underline flex items-center gap-1 truncate">
                          View Site <Upload size={12} className="rotate-45" />
                        </a>
                      ) : (
                        <p className="text-gray-400 text-sm">Not provided</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Projects Widget (Student Only) */}
            {displayUser?.role === 'student' && (
              <section>
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider flex items-center justify-between">
                  Projects
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">{joinedProjects.length}</span>
                </h3>

                <div className="space-y-3">
                  {projectsLoading ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : joinedProjects.length > 0 ? (
                    joinedProjects.map(proj => (
                      <button
                        key={proj._id}
                        onClick={() => navigate(`/projects/${proj._id}`)}
                        className="w-full text-left group p-4 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900 truncate pr-4">{proj.title}</span>
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          <ArrowLeft size={14} className="rotate-180" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No active projects.</p>
                  )}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
