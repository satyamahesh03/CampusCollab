import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { projectAPI } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaComment, FaUsers, FaPlus, FaTrash, FaCheck, FaTimes, FaPaperPlane, FaExternalLinkAlt, FaSearch, FaReply, FaShare, FaArrowLeft } from 'react-icons/fa';
import { formatRelativeTime, getDomainColor, getStatusColor, domains, departments, skills as allSkills } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'open' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isStudent } = useAuth();
  const { addNotification } = useGlobal();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  // Fetch single project if ID in URL
  useEffect(() => {
    if (projectId) {
      fetchSingleProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    // Only fetch list if not viewing single project
    if (!projectId) {
      const delayDebounce = setTimeout(() => {
        fetchProjects();
      }, 300);

      return () => clearTimeout(delayDebounce);
    }
  }, [filters, searchQuery, projectId]);

  // Auto-open project from URL parameter
  useEffect(() => {
    const projectIdToOpen = searchParams.get('open');
    if (projectIdToOpen && projects.length > 0) {
      const projectToOpen = projects.find(p => p._id === projectIdToOpen);
      if (projectToOpen) {
        setSelectedProject(projectToOpen);
        // Clear the URL parameter
        searchParams.delete('open');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [projects, searchParams, setSearchParams]);

  const fetchSingleProject = async (id) => {
    try {
      setLoading(true);
      const response = await projectAPI.getById(id);
      setSelectedProject(response.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Project not found' });
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const queryParams = { ...filters };
      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
      }
      const response = await projectAPI.getAll(queryParams);
      setProjects(response.data);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to fetch projects',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (projectId) => {
    try {
      await projectAPI.like(projectId);
      fetchProjects();
      addNotification({
        type: 'success',
        message: 'Project liked!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to like project',
      });
    }
  };

  const handleJoin = async (projectId) => {
    try {
      await projectAPI.join(projectId, { role: 'Member' });
      fetchProjects();
      addNotification({
        type: 'success',
        message: 'Successfully joined project!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to join project',
      });
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await projectAPI.delete(projectId);
      fetchProjects();
      addNotification({
        type: 'success',
        message: 'Project deleted successfully!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to delete project',
      });
    }
  };

  const handleComplete = async (projectId) => {
    if (!window.confirm('Mark this project as completed?')) return;
    
    try {
      await projectAPI.close(projectId);
      fetchProjects();
      addNotification({
        type: 'success',
        message: 'Project marked as completed!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to complete project',
      });
    }
  };

  const handleProjectClick = (project) => {
    // Navigate to unique URL for the project
    navigate(`/projects/${project._id}`);
  };

  const handleShare = (project) => {
    const url = `${window.location.origin}/projects/${project._id}`;
    navigator.clipboard.writeText(url).then(() => {
      addNotification({ type: 'success', message: 'Link copied to clipboard!' });
    }).catch(() => {
      addNotification({ type: 'error', message: 'Failed to copy link' });
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          {(projectId || selectedProject) && (
            <button
              onClick={() => {
                setSelectedProject(null);
                navigate('/projects');
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
            >
              <FaArrowLeft />
              <span>Back to Projects</span>
            </button>
          )}
          {!(projectId || selectedProject) && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-600 mt-1">Discover and collaborate on innovative projects</p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {(projectId || selectedProject) && (
            <button
              onClick={() => handleShare(selectedProject)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <FaShare />
              <span>Share</span>
            </button>
          )}
          {(user?.role === 'student' || user?.role === 'faculty') && !(projectId || selectedProject) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
            >
              <FaPlus />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} setFilters={setFilters} showYear={false} />

      {/* Search Bar */}
      {/* <div className="mb-6">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title or domain..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div> */}

      {/* Sort and Filter Options */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setFilters({ sort: 'recent', status: undefined })}
          className={`px-4 py-2 rounded-lg transition ${
            filters.sort === 'recent' && !filters.status
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => setFilters({ status: 'open', sort: undefined })}
          className={`px-4 py-2 rounded-lg transition ${
            filters.status === 'open'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilters({ status: 'closed', sort: undefined })}
          className={`px-4 py-2 rounded-lg transition ${
            filters.status === 'closed'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <Loading />
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <ProjectCard
              key={project._id}
              project={project}
              index={index}
              onClick={() => handleProjectClick(project)}
              onDelete={handleDelete}
              userId={user?.id}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchProjects}
        />
      )}

      {/* Project Detail View */}
      {selectedProject && (
        <ProjectDetailView
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            navigate('/projects');
          }}
          onLike={handleLike}
          onJoin={handleJoin}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onUpdate={fetchProjects}
          onAutoComplete={async () => {
            // Close modal and navigate back
            setSelectedProject(null);
            navigate('/projects');
            // Switch to completed filter
            setFilters({ status: 'closed', sort: undefined });
            // Wait a bit and refresh
            setTimeout(() => {
              fetchProjects();
            }, 100);
          }}
          userId={user?.id}
        />
      )}
    </div>
  );
};

const ProjectCard = ({ project, index, onClick, onDelete, userId }) => {
  const isOwner = project.createdBy?._id === userId || project.createdBy === userId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer p-6"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900 flex-1 hover:text-primary-600 transition">
          {project.title}
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project._id);
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete project"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>

      {/* Domains */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.domains?.map((domain) => (
          <span
            key={domain}
            className={`px-3 py-1 rounded-full text-xs font-medium ${getDomainColor(domain)}`}
          >
            {domain}
          </span>
        ))}
      </div>

      {/* Skills */}
      {project.skills && project.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {project.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100"
            >
              {skill}
            </span>
          ))}
          {project.skills.length > 3 && (
            <span className="text-xs text-gray-500">+{project.skills.length - 3} more</span>
          )}
        </div>
      )}

      {/* Creator */}
      <div className="text-sm text-gray-500 mb-4">
        by {project.createdBy?.name} • {formatRelativeTime(project.createdAt)}
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-6 text-gray-600 text-sm">
        <span className="flex items-center space-x-2">
          <FaHeart className="text-red-500" />
          <span>{project.likes?.length || 0}</span>
        </span>
        <span className="flex items-center space-x-2">
          <FaComment className="text-blue-500" />
          <span>{project.comments?.length || 0}</span>
        </span>
        <span className="flex items-center space-x-2">
          <FaUsers className="text-green-500" />
          <span>{project.participants?.length || 0}</span>
        </span>
      </div>
    </motion.div>
  );
};

const CreateProjectModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    teamRequirements: '',
    domains: [],
    skills: [],
    department: '',
    gitLink: '',
  });
  const [customDomain, setCustomDomain] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const { addNotification } = useGlobal();

  const toggleDomain = (domain) => {
    if (formData.domains.includes(domain)) {
      setFormData({
        ...formData,
        domains: formData.domains.filter(d => d !== domain)
      });
    } else {
      setFormData({
        ...formData,
        domains: [...formData.domains, domain]
      });
    }
  };

  const toggleSkill = (skill) => {
    if (formData.skills.includes(skill)) {
      setFormData({
        ...formData,
        skills: formData.skills.filter(s => s !== skill)
      });
    } else {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill]
      });
    }
  };

  const addCustomDomain = () => {
    if (customDomain.trim() && !formData.domains.includes(customDomain.trim())) {
      setFormData({
        ...formData,
        domains: [...formData.domains, customDomain.trim()]
      });
      setCustomDomain('');
    }
  };

  const addCustomSkill = () => {
    if (!customSkill.trim()) return;
    const skill = customSkill.trim();
    if (formData.skills.includes(skill)) {
      addNotification({
        type: 'error',
        message: 'Skill already added',
      });
      return;
    }
    setFormData({
      ...formData,
      skills: [...formData.skills, skill]
    });
    setCustomSkill('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate at least one domain is selected
    if (formData.domains.length === 0) {
      addNotification({
        type: 'error',
        message: 'Please select at least one domain',
      });
      return;
    }
    
    try {
      await projectAPI.create(formData);
      addNotification({
        type: 'success',
        message: 'Project created successfully!',
      });
      onSuccess();
      onClose();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to create project',
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
        <h2 className="text-2xl font-bold mb-6">Create New Project</h2>
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
              placeholder="e.g., AI-Powered Student Assistant"
            />
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
              placeholder="Describe your project idea..."
            />
          </div>

          {/* Team Requirements */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Team Requirements <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.teamRequirements}
              onChange={(e) => setFormData({ ...formData, teamRequirements: e.target.value })}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., 2 Developers, 1 Designer, 1 ML Engineer"
            />
          </div>

          {/* Domain Requirements */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Domain Requirements <span className="text-red-500">*</span>
            </label>
            
            {/* Selected Domains Display */}
            {formData.domains.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                {formData.domains.map((domain) => (
                  <span
                    key={domain}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getDomainColor(domain)} flex items-center space-x-2`}
                  >
                    <span>{domain}</span>
                    <button
                      type="button"
                      onClick={() => toggleDomain(domain)}
                      className="hover:text-red-600"
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Predefined Domains Checkboxes */}
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto mb-3">
              <div className="grid grid-cols-2 gap-3">
                {domains.map((domain) => (
                  <label
                    key={domain}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.domains.includes(domain)}
                      onChange={() => toggleDomain(domain)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{domain}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Domain Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomDomain();
                  }
                }}
                placeholder="Add custom domain..."
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addCustomDomain}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                <FaPlus />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select from predefined domains or add your own</p>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Key Skills (search & select)
            </label>

            {/* Selected Skills */}
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium flex items-center space-x-2 border border-primary-200 shadow-sm"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className="hover:text-red-600"
                      aria-label={`Remove ${skill}`}
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Searchable dropdown */}
            <div className="mb-3">
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Search skills (e.g., React, Python, Figma)..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {allSkills
                  .filter((s) => s.toLowerCase().includes(skillSearch.trim().toLowerCase()))
                  .map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.skills.includes(skill)}
                        onChange={() => toggleSkill(skill)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{skill}</span>
                    </label>
                  ))}
              </div>
              {allSkills.filter((s) => s.toLowerCase().includes(skillSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-500">No skills found for that search.</p>
              )}
            </div>

            {/* Custom skill */}
            <div className="flex space-x-2 mt-3">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSkill();
                  }
                }}
                placeholder="Add a custom skill (optional)"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                <FaPlus />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Use search to quickly find skills across departments.</p>
          </div>

          {/* Department */}
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

          {/* Git Link (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Git Repository Link (Optional)
            </label>
            <input
              type="url"
              value={formData.gitLink}
              onChange={(e) => setFormData({ ...formData, gitLink: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="https://github.com/username/repo"
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition font-medium"
            >
              Create Project
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

const ProjectDetailView = ({ project, onClose, onLike, onJoin, onComplete, onDelete, onUpdate, onAutoComplete, userId }) => {
  const [comment, setComment] = useState('');
  const [projectData, setProjectData] = useState(project);
  const [loading, setLoading] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const { addNotification } = useGlobal();
  const navigate = useNavigate();
  
  const isLiked = projectData.likes?.includes(userId);
  const hasJoined = projectData.participants?.some((p) => p.user?._id === userId || p.user === userId);
  const isOwner = projectData.createdBy?._id === userId || projectData.createdBy === userId;
  const hasPendingRequest = projectData.joinRequests?.some((r) => (r.user?._id === userId || r.user === userId) && r.status === 'pending');
  const pendingRequestsCount = projectData.joinRequests?.filter(r => r.status === 'pending').length || 0;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setLoading(true);
      const response = await projectAPI.addComment(projectData._id, { text: comment });
      setProjectData(response.data);
      setComment('');
      addNotification({
        type: 'success',
        message: 'Comment added!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to add comment',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) return;

    try {
      setLoading(true);
      const response = await projectAPI.addReply(projectData._id, commentId, { text: replyText });
      setProjectData(response.data);
      setReplyText('');
      setReplyingTo(null);
      addNotification({
        type: 'success',
        message: 'Reply added!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to add reply',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (clickedUserId) => {
    if (!clickedUserId) return;
    // Navigate to profile with userId parameter
    navigate(`/profile?userId=${clickedUserId}`);
  };

  const handleLikeClick = async () => {
    await onLike(projectData._id);
    // Refresh project data
    const response = await projectAPI.getAll({});
    const updatedProject = response.data.find(p => p._id === projectData._id);
    if (updatedProject) setProjectData(updatedProject);
  };

  const handleJoinClick = async () => {
    await onJoin(projectData._id);
    // Refresh project data
    const response = await projectAPI.getAll({});
    const updatedProject = response.data.find(p => p._id === projectData._id);
    if (updatedProject) setProjectData(updatedProject);
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      const result = await projectAPI.approveRequest(projectData._id, requestId);
      
      // Check if project was auto-completed
      if (result.data.status === 'closed') {
        addNotification({
          type: 'success',
          message: result.message || 'Project requirements met! Project marked as complete.',
        });
        // Close modal, refresh list, and switch to completed filter
        if (onAutoComplete) {
          onAutoComplete();
        } else {
          onClose();
          onUpdate();
        }
      } else {
        addNotification({
          type: 'success',
          message: 'Join request approved!',
        });
        // Refresh project data in modal
        const response = await projectAPI.getAll({});
        const updatedProject = response.data.find(p => p._id === projectData._id);
        if (updatedProject) setProjectData(updatedProject);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to approve request',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true);
      await projectAPI.rejectRequest(projectData._id, requestId);
      addNotification({
        type: 'success',
        message: 'Join request rejected',
      });
      // Refresh project data
      const response = await projectAPI.getAll({});
      const updatedProject = response.data.find(p => p._id === projectData._id);
      if (updatedProject) setProjectData(updatedProject);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to reject request',
      });
    } finally {
      setLoading(false);
    }
  };

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
            {/* Completed Project Banner */}
            {projectData.status === 'closed' && (
              <div className="mb-6 bg-gray-800 text-white rounded-lg p-4 flex items-center space-x-3">
                <FaCheck className="text-2xl" />
                <div>
                  <h4 className="font-semibold">Project Completed</h4>
                  <p className="text-sm text-gray-300">This project has been marked as complete. No further actions can be taken.</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-3xl font-bold text-gray-900 flex-1 pr-8">
                  {projectData.title}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(projectData.status)}`}>
                  {projectData.status}
                </span>
              </div>

              {/* Creator and Date */}
              <div className="text-gray-600 text-sm mb-4">
                by <span className="font-medium">{projectData.createdBy?.name}</span> • {formatRelativeTime(projectData.createdAt)}
              </div>

              {/* Domains */}
              <div className="flex flex-wrap gap-2 mb-4">
                {projectData.domains?.map((domain) => (
                  <span
                    key={domain}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getDomainColor(domain)}`}
                  >
                    {domain}
                  </span>
                ))}
              </div>

            {/* Skills */}
            {projectData.skills && projectData.skills.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {projectData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

              {/* Stats */}
              <div className="flex items-center space-x-6 text-gray-600 text-sm">
                <span className="flex items-center space-x-2">
                  <FaHeart className="text-red-500" />
                  <span>{projectData.likes?.length || 0} likes</span>
                </span>
                <span className="flex items-center space-x-2">
                  <FaComment className="text-blue-500" />
                  <span>{projectData.comments?.length || 0} comments</span>
                </span>
                <span className="flex items-center space-x-2">
                  <FaUsers className="text-green-500" />
                  <span>{projectData.participants?.length || 0} participants</span>
                </span>
              </div>
            </div>

            {/* Divider */}
            <hr className="my-6" />

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">About this Project</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{projectData.description}</p>
            </div>

            {/* Team Requirements */}
            {projectData.teamRequirements && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Team Requirements</h3>
                <p className="text-gray-700">{projectData.teamRequirements}</p>
              </div>
            )}

            {/* Git Link */}
            {projectData.gitLink && (
              <div className="mb-6">
                <a
                  href={projectData.gitLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
                >
                  <FaExternalLinkAlt />
                  <span>View Repository</span>
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 mb-8">
              {projectData.status !== 'closed' && (
                <button
                  onClick={handleLikeClick}
                  className={`flex-1 py-3 rounded-lg transition font-medium flex items-center justify-center space-x-2 ${
                    isLiked
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FaHeart />
                  <span>{isLiked ? 'Liked' : 'Like'}</span>
                </button>
              )}
              {projectData.status === 'open' && !hasJoined && !hasPendingRequest && !isOwner && (
                <button
                  onClick={handleJoinClick}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium flex items-center justify-center space-x-2"
                >
                  <FaUsers />
                  <span>Request to Join</span>
                </button>
              )}
              {hasPendingRequest && !isOwner && (
                <button
                  disabled
                  className="flex-1 py-3 bg-yellow-100 text-yellow-700 rounded-lg font-medium flex items-center justify-center space-x-2"
                >
                  <FaUsers />
                  <span>Request Pending</span>
                </button>
              )}
              {hasJoined && !isOwner && (
                <button
                  disabled
                  className="flex-1 py-3 bg-green-100 text-green-600 rounded-lg font-medium flex items-center justify-center space-x-2"
                >
                  <FaCheck />
                  <span>Joined</span>
                </button>
              )}
              {isOwner && projectData.status === 'open' && (
                <>
                  {pendingRequestsCount > 0 && (
                    <button
                      onClick={() => setShowJoinRequests(!showJoinRequests)}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center space-x-2"
                    >
                      <FaUsers />
                      <span>View Requests ({pendingRequestsCount})</span>
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await onComplete(projectData._id);
                      onClose();
                      onUpdate();
                    }}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <FaCheck />
                    <span>Mark as Complete</span>
                  </button>
                </>
              )}
            </div>

            {/* Join Requests Management (for owner) */}
            {isOwner && showJoinRequests && pendingRequestsCount > 0 && (
              <div className="mb-8 bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Pending Join Requests</h4>
                <div className="space-y-3">
                  {projectData.joinRequests
                    ?.filter(r => r.status === 'pending')
                    .map((request) => (
                      <div
                        key={request._id}
                        className="bg-white rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{request.user?.name}</p>
                          <p className="text-sm text-gray-600">
                            {request.user?.email} • {request.user?.department}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Requested {formatRelativeTime(request.requestedAt)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveRequest(request._id)}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request._id)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <hr className="my-8" />

            {/* Comments Section - Reddit Style */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Discussion ({projectData.comments?.length || 0})
              </h3>

              {/* Add Comment Form - Only show if project is not closed */}
              {projectData.status !== 'closed' ? (
                <form onSubmit={handleAddComment} className="mb-6">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What are your thoughts?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={loading || !comment.trim()}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaPaperPlane />
                      <span>Comment</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg text-center">
                  <p className="text-gray-600">
                    This project is completed. Comments and likes are disabled.
                  </p>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {projectData.comments?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaComment className="mx-auto text-4xl mb-2 opacity-50" />
                    <p>No comments yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  projectData.comments?.map((comment, index) => (
                    <motion.div
                      key={comment._id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <button
                              onClick={() => handleUserClick(comment.user?._id)}
                              className="font-medium text-gray-900 hover:text-primary-600 transition cursor-pointer"
                            >
                              {comment.user?.name || 'Unknown User'}
                            </button>
                            <span className="text-gray-500 text-xs">
                              • {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap mb-2">{comment.text}</p>
                          
                          {/* Reply Button - Only show if project is not closed and comment has valid ID */}
                          {projectData.status !== 'closed' && comment._id && (
                            <button
                              onClick={() => {
                                setReplyingTo(comment._id);
                                setReplyText('');
                              }}
                              className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 transition"
                            >
                              <FaReply />
                              <span>Reply</span>
                            </button>
                          )}

                          {/* Reply Input */}
                          {replyingTo === comment._id && comment._id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3"
                            >
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write your reply..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex justify-end space-x-2 mt-2">
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText('');
                                  }}
                                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleAddReply(comment._id)}
                                  disabled={loading || !replyText.trim()}
                                  className="px-4 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FaPaperPlane className="text-xs" />
                                  <span>Reply</span>
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {/* Nested Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-300">
                              {comment.replies.map((reply, replyIndex) => (
                                <motion.div
                                  key={reply._id || replyIndex}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: replyIndex * 0.05 }}
                                  className="flex items-start space-x-2"
                                >
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                      {reply.user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <button
                                        onClick={() => handleUserClick(reply.user?._id)}
                                        className="font-medium text-sm text-gray-900 hover:text-primary-600 transition cursor-pointer"
                                      >
                                        {reply.user?.name || 'Unknown User'}
                                      </button>
                                      <span className="text-gray-500 text-xs">
                                        • {formatRelativeTime(reply.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{reply.text}</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default Projects;

