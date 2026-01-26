import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, chatAPI, projectAPI } from '../utils/api';
import { getRoleColor, departments } from '../utils/helpers';
import { useGlobal } from '../context/GlobalContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Camera, Mail, Building2, Calendar, Award, Globe, BookOpen, Edit2, Save, X, Plus, Trash2, Upload, Check, AlertCircle, Image as ImageIcon, ArrowLeft, MessageCircle, FolderKanban, Hash } from 'lucide-react';
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
  const projectsDropdownRef = useRef(null);
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
  const [showProjects, setShowProjects] = useState(false);

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

  // Close projects dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectsDropdownRef.current && !projectsDropdownRef.current.contains(event.target)) {
        setShowProjects(false);
      }
    };

    if (showProjects) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProjects]);

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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100 py-6 md:py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button when viewing another user */}
        {isViewingOtherUser && (
          <button
            onClick={() => window.history.back()}
            className="mb-4 flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        )}
        {/* Header Card */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-100/50 overflow-hidden mb-6">
          {/* Profile Info Section */}
          <div className="px-4 md:px-8 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6 relative">
              {/* Profile Picture */}
              <div className="relative group mb-4 md:mb-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg border-4 border-gray-200 shadow-2xl overflow-hidden bg-gradient-to-br from-amber-500 to-yellow-500 ring-4 ring-amber-100">
                  {(isViewingOtherUser ? displayUser?.profilePicture : imagePreview) ? (
                    <img
                      src={isViewingOtherUser ? displayUser?.profilePicture : imagePreview}
                      alt={displayUser?.name || formData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                      {getInitials(displayUser?.name || formData.name || user?.name || 'U')}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowImageUploadHelp(true);
                        }}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-lg bg-black bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
                      >
                        <Camera size={24} className="mb-1" />
                        <span className="text-xs font-medium">Change Photo</span>
                        <span className="text-xs mt-1 opacity-75">Max 5MB</span>
                      </button>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                          title="Remove image"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {/* Upload status badge */}
                    {imagePreview && imageInfo.name && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                        <Check size={12} />
                        Ready
                      </div>
                    )}
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Name and Role */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="mb-3">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className="text-3xl font-bold text-gray-900 border-b-2 border-gray-300 focus:border-amber-600 outline-none bg-transparent pb-2 w-full transition-colors"
                      required
                    />
                    {!formData.name.trim() && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Name is required
                      </p>
                    )}
                  </div>
                ) : (
                  <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">{capitalizeName(displayUser?.name || '')}</h1>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold capitalize ${getRoleColor(displayUser?.role)} shadow-sm`}>
                    {displayUser?.role}
                  </span>
                </div>

                {/* Academic Info - Under Name */}
                <div className="mt-4 md:mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    {displayUser?.role === 'student' ? (
                      <>
                        {/* Roll Number (Students - First) */}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Hash size={16} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium">Roll Number</p>
                            {isEditing ? (
                              <input
                                type="text"
                                name="rollNumber"
                                value={formData.rollNumber}
                                onChange={(e) => {
                                  // Allow alphanumeric characters, convert to uppercase, limit to 10 characters
                                  const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
                                  setFormData(prev => ({ ...prev, rollNumber: value }));
                                }}
                                placeholder="22331a0575"
                                maxLength="10"
                                className="w-full mt-0.5 px-2 py-1 border border-blue-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium uppercase"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                {displayUser?.rollNumber || '-'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Year (Students - Second) */}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-100 rounded-lg">
                            <Calendar size={16} className="text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium">Year of Study</p>
                            {isEditing ? (
                              <select
                                name="year"
                                value={formData.year}
                                onChange={handleChange}
                                className="w-full mt-0.5 px-2 py-1 border border-amber-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium"
                                required
                              >
                                <option value="">Select Year</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                              </select>
                            ) : (
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                {displayUser?.year ? `Year ${displayUser.year}` : 'Not specified'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Department (Students - Third) */}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Building2 size={16} className="text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium">Department</p>
                            {isEditing ? (
                              <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="w-full mt-0.5 px-2 py-1 border border-purple-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none text-sm font-medium"
                                required
                              >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">{displayUser?.department || 'Not specified'}</p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : displayUser?.role === 'faculty' ? (
                      <>
                        {/* Designation (Faculty - First) */}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-100 rounded-lg">
                            <Award size={16} className="text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium">Designation</p>
                            {isEditing ? (
                              <input
                                type="text"
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                placeholder="e.g., Assistant Professor"
                                className="w-full mt-0.5 px-2 py-1 border border-amber-200 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-transparent outline-none text-sm font-medium"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">{displayUser?.designation || 'Not specified'}</p>
                            )}
                          </div>
                        </div>

                        {/* Department (Faculty - Second) */}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Building2 size={16} className="text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium">Department</p>
                            {isEditing ? (
                              <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="w-full mt-0.5 px-2 py-1 border border-purple-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none text-sm font-medium"
                                required
                              >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">{displayUser?.department || 'Not specified'}</p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Joined Projects Icon - Right Side */}
              {displayUser?.role === 'student' && (
                <div ref={projectsDropdownRef} className="absolute top-0 right-0 flex flex-col items-end gap-1 z-10">
                  <button
                    onClick={() => setShowProjects(prev => !prev)}
                    className="group relative flex flex-col items-center gap-1"
                    title="Joined Projects"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110">
                      <FolderKanban size={18} className="md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-amber-600 transition-colors">
                      Projects
                    </span>
                  </button>

                  {/* Projects Dropdown */}
                  {showProjects && (
                    <div className="absolute top-14 right-0 w-72 md:w-80 bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 z-20 flex flex-col" style={{ maxHeight: '600px' }}>
                      <div className="p-3 border-b border-amber-100/50 bg-gradient-to-r from-amber-50 to-yellow-50 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-gray-900">Joined Projects</h3>
                        <p className="text-xs text-gray-600 mt-0.5">{joinedProjects.length} project{joinedProjects.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div
                        className="overflow-y-auto overflow-x-hidden"
                        style={{
                          maxHeight: '520px',
                          WebkitOverflowScrolling: 'touch',
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#cbd5e1 #f1f5f9'
                        }}
                      >
                        {projectsLoading ? (
                          <div className="p-4 text-center text-gray-500 text-sm">Loading projects...</div>
                        ) : joinedProjects.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">No joined projects yet.</div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {joinedProjects.map((proj) => (
                              <button
                                key={proj._id}
                                onClick={() => {
                                  navigate(`/projects/${proj._id}`);
                                  setShowProjects(false);
                                }}
                                className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                              >
                                <p className="font-semibold text-sm text-gray-900 mb-1 truncate">{proj.title}</p>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-gray-600 truncate flex-1">
                                    {proj.domains?.join(', ') || 'General'}
                                  </p>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 capitalize whitespace-nowrap flex-shrink-0">
                                    {proj.status}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Edit/Save/Message Buttons */}
            <div className="flex justify-end mt-4 md:mt-6">
              {isViewingOtherUser ? (
                <button
                  onClick={handleMessage}
                  disabled={!viewedUser || messageLoading}
                  className="bg-amber-500 text-white px-6 py-2.5 rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={18} />
                  {messageLoading ? 'Starting...' : 'Message'}
                </button>
              ) : (
                !isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-amber-500 text-white px-6 py-2.5 rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  >
                    <Edit2 size={18} />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="bg-gray-300 text-gray-700 px-6 py-2.5 rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2.5 rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Image Info Display - Only shown in edit mode with image */}
            {isEditing && imageInfo.name && (
              <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ImageIcon size={24} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    Image Ready for Upload
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Compressed</span>
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Name:</span> {imageInfo.name}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Size:</span> <span className="text-green-600 font-semibold">{imageInfo.size}</span>
                    </p>
                    {imageInfo.type && (
                      <p className="text-gray-700">
                        <span className="font-medium">Format:</span> {imageInfo.type.split('/')[1]?.toUpperCase() || 'JPEG'}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      ✓ Optimized for fast upload and storage
                    </p>
                  </div>
                </div>
                <Check size={24} className="text-green-600 mt-1" />
              </div>
            )}

            {/* Image Upload Help - First time editing */}
            {isEditing && !imagePreview && showImageUploadHelp && (
              <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Upload size={20} className="text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-2">Upload Profile Picture</h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                        Click on the profile circle above
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                        Maximum file size: 5MB
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                        Supported formats: JPG, PNG, GIF, WebP
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setShowImageUploadHelp(false)}
                    className="text-amber-600 hover:text-amber-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills Section (Students Only) */}
            {displayUser?.role === 'student' && (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-100/50 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-amber-100 rounded-lg mr-3">
                      <Award className="text-amber-600" size={24} />
                    </div>
                    Skills
                  </div>
                  {!isEditing && displayUser?.skills && displayUser?.skills.length > 0 && (
                    <span className="text-sm text-gray-500 font-normal">
                      {displayUser?.skills.length} skill{displayUser?.skills.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </h2>
                {isEditing ? (
                  <div>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                        placeholder="e.g., React, Python, Design..."
                        className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-colors"
                        maxLength="30"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        disabled={!newSkill.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all flex items-center gap-2 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                      >
                        <Plus size={18} />
                        Add
                      </button>
                    </div>
                    {formData.skills.length >= 8 && formData.skills.length < 10 && (
                      <p className="text-sm text-amber-600 mb-3 flex items-center gap-1">
                        <AlertCircle size={14} />
                        You can add {10 - formData.skills.length} more skill{10 - formData.skills.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 rounded-full text-sm font-medium flex items-center gap-2 border border-amber-200 shadow-sm hover:shadow-md transition-all"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-amber-900 hover:text-red-600 transition-colors hover:scale-110 transform"
                            title="Remove skill"
                          >
                            <X size={16} />
                          </button>
                        </span>
                      ))}
                      {formData.skills.length === 0 && (
                        <p className="text-gray-400 italic text-sm flex items-center gap-2">
                          <AlertCircle size={16} />
                          Add your skills to showcase your expertise (up to 10 skills)
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {displayUser?.skills && displayUser?.skills.length > 0 ? (
                      displayUser?.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-primary-50 to-indigo-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200 shadow-sm hover:shadow-md transition-all transform hover:scale-105"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-400 italic flex items-center gap-2">
                        <AlertCircle size={16} />
                        {isViewingOtherUser ? 'No skills added yet.' : 'No skills added yet. Add skills to help others know your expertise!'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* About Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-100/50 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="p-2 bg-amber-100 rounded-lg mr-3">
                  <BookOpen className="text-amber-600" size={24} />
                </div>
                About
              </h2>
              {isEditing ? (
                <div>
                  <div className="relative">
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows="5"
                      maxLength="300"
                      placeholder="Tell us about yourself... Share your interests, goals, or what makes you unique!"
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none transition-colors ${bioPercentage > 90 ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                        }`}
                    />
                    {/* Character counter with progress bar */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-medium ${bioPercentage > 90 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                          {formData.bio.length} / 300 characters
                        </span>
                        <span className={`text-xs ${bioCharsRemaining < 50 ? 'text-red-600 font-semibold' : 'text-gray-500'
                          }`}>
                          {bioCharsRemaining} remaining
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${bioPercentage > 90 ? 'bg-red-500' : bioPercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                          style={{ width: `${bioPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed text-base">
                  {displayUser?.bio || (
                    <span className="italic text-gray-400 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {isViewingOtherUser ? 'No bio added yet.' : 'No bio added yet. Click "Edit Profile" to add one and tell others about yourself!'}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Contact & Info */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-100/50 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Info</h2>
              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Mail size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Email</p>
                    <p className="text-gray-900 font-medium break-all text-sm">{displayUser?.email}</p>
                  </div>
                </div>

                {/* Website (Students Only) */}
                {displayUser?.role === 'student' && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Globe size={20} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Website / LinkedIn</p>
                      {isEditing ? (
                        <input
                          type="url"
                          name="websiteUrl"
                          value={formData.websiteUrl}
                          onChange={handleChange}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                        />
                      ) : displayUser?.websiteUrl ? (
                        <a
                          href={displayUser?.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 font-medium hover:underline break-all text-sm flex items-center gap-1"
                        >
                          {displayUser?.websiteUrl}
                          <Upload size={12} className="transform rotate-45" />
                        </a>
                      ) : (
                        <p className="text-gray-400 italic text-sm">Not added</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
