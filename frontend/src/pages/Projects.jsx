import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { projectAPI } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaRegHeart, FaComment, FaUsers, FaUserPlus, FaHandshake, FaPlus, FaTrash, FaCheck, FaTimes, FaPaperPlane, FaExternalLinkAlt, FaSearch, FaReply, FaArrowLeft, FaMagic, FaThumbsUp, FaStar } from 'react-icons/fa';
import { formatRelativeTime, getDomainColor, getStatusColor, domains, departments, skills as allSkills } from '../utils/helpers';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';

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
  const location = useLocation();

  // Fetch single project if ID in URL
  useEffect(() => {
    if (projectId) {
      fetchSingleProject(projectId);
    } else {
      // Clear selected project when navigating back (browser back button)
      setSelectedProject(null);
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
      
      // Scroll to specific comment/reply if navigating from notification
      if (location.state?.scrollToComment) {
        setTimeout(() => {
          const commentId = location.state.scrollToComment;
          const replyId = location.state.scrollToReply;
          const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
          if (commentElement) {
            commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            commentElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
            setTimeout(() => {
              commentElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
            }, 3000);
            
            // If there's a specific reply, highlight it
            if (replyId) {
              setTimeout(() => {
                const replyElement = document.querySelector(`[data-reply-id="${replyId}"]`);
                if (replyElement) {
                  replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  replyElement.classList.add('ring-2', 'ring-green-500', 'ring-opacity-50');
                  setTimeout(() => {
                    replyElement.classList.remove('ring-2', 'ring-green-500', 'ring-opacity-50');
                  }, 3000);
                }
              }, 500);
            }
          }
        }, 500);
      }
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

  // If viewing a specific project, show only the project detail page
  if ((projectId || selectedProject) && selectedProject) {
    return (
      <>
        {/* Project Detail View - Full Page */}
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
            // Navigate back and switch to completed filter
            setSelectedProject(null);
            navigate('/projects');
            setFilters({ status: 'closed', sort: undefined });
            // Wait a bit and refresh
            setTimeout(() => {
              fetchProjects();
            }, 100);
          }}
          userId={user?.id}
        />
        {/* Create Modal */}
        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchProjects}
          />
        )}
      </>
    );
  }

  // Otherwise, show the projects list
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Discover and collaborate on innovative projects</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {(user?.role === 'student' || user?.role === 'faculty') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-amber-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-amber-600 transition text-sm sm:text-base flex-1 sm:flex-initial justify-center"
            >
              <FaPlus />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} setFilters={setFilters} showYear={false} />

      {/* Sort and Filter Options */}
      <div className="flex space-x-2 sm:space-x-4 mb-4 sm:mb-6">
        <button
          onClick={() => setFilters({ status: 'open', sort: undefined })}
          className={`px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base flex-1 sm:flex-initial ${
            filters.status === 'open'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilters({ status: 'closed', sort: undefined })}
          className={`px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base flex-1 sm:flex-initial ${
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
      className="bg-white/60 backdrop-blur-sm rounded-lg transition-all duration-300 cursor-pointer p-4 sm:p-6 flex flex-col border border-amber-100/50 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3 sm:mb-4 flex-shrink-0 gap-2">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1 hover:text-amber-600 transition line-clamp-2 pr-2">
          {project.title}
        </h3>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project._id);
              }}
              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Delete project"
            >
              <FaTrash className="text-sm sm:text-base" />
            </button>
          )}
        </div>
      </div>

      {/* Domains */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-2 flex-shrink-0">
        {project.domains?.slice(0, 3).map((domain) => (
          <span
            key={domain}
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getDomainColor(domain)}`}
          >
            {domain}
          </span>
        ))}
        {project.domains?.length > 3 && (
          <span className="text-xs text-gray-500 px-2 py-0.5 sm:py-1">+{project.domains.length - 3} more</span>
        )}
      </div>

      {/* Skills */}
      {project.skills && project.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-2 flex-shrink-0">
          {project.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200"
            >
              {skill}
            </span>
          ))}
          {project.skills.length > 3 && (
            <span className="text-xs text-gray-500 px-2 py-0.5 sm:py-1">+{project.skills.length - 3} more</span>
          )}
        </div>
      )}

      {/* Creator */}
      <div className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-2 flex-shrink-0 mt-auto">
        by {project.createdBy?.name} • {formatRelativeTime(project.createdAt)}
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4 sm:space-x-6 text-gray-600 text-xs sm:text-sm flex-shrink-0">
        <span className="flex items-center space-x-1 sm:space-x-2">
          <FaHeart className="text-red-500 text-sm sm:text-base" />
          <span>{project.likes?.length || 0}</span>
        </span>
        <span className="flex items-center space-x-1 sm:space-x-2">
          <FaComment className="text-amber-500 text-sm sm:text-base" />
          <span>{project.comments?.length || 0}</span>
        </span>
        <span className="flex items-center space-x-1 sm:space-x-2">
          <FaUsers className="text-green-500 text-sm sm:text-base" />
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
    
    // Validate at least one skill is selected
    if (formData.skills.length === 0) {
      addNotification({
        type: 'error',
        message: 'Please select at least one key skill',
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
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-10">Create New Project</h2>
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
              placeholder="e.g., AI-Powered Student Assistant"
            />
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
              placeholder="Describe your project idea..."
            />
          </div>

          {/* Team Requirements */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Team Requirements <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.teamRequirements}
              onChange={(e) => setFormData({ ...formData, teamRequirements: e.target.value })}
              required
              rows={3}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500 resize-y"
              placeholder="e.g., 2 Developers, 1 Designer, 1 ML Engineer&#10;Or describe the roles and skills needed for your team..."
            />
            <p className="text-xs text-gray-500 mt-1">Describe the team composition or requirements in detail</p>
          </div>

          {/* Domain Requirements */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
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
            <div className="border rounded-lg p-3 sm:p-4 max-h-48 overflow-y-auto mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {domains.map((domain) => (
                  <label
                    key={domain}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 sm:p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.domains.includes(domain)}
                      onChange={() => toggleDomain(domain)}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 flex-shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">{domain}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Domain Input */}
            <div className="flex flex-col sm:flex-row gap-2">
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
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={addCustomDomain}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm sm:text-base flex items-center justify-center sm:flex-initial"
              >
                <FaPlus />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select from predefined domains or add your own</p>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Key Skills <span className="text-red-500">*</span>
            </label>

            {/* Selected Skills */}
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium flex items-center space-x-2 border border-amber-200 shadow-sm"
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
            {formData.skills.length === 0 && (
              <p className="text-xs text-red-500 mb-2">At least one skill is required</p>
            )}

            {/* Searchable dropdown */}
            <div className="mb-3">
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Search skills (e.g., React, Python, Figma)..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="border rounded-lg p-3 sm:p-4 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {allSkills
                  .filter((s) => s.toLowerCase().includes(skillSearch.trim().toLowerCase()))
                  .map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 sm:p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.skills.includes(skill)}
                        onChange={() => toggleSkill(skill)}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 flex-shrink-0"
                      />
                      <span className="text-xs sm:text-sm text-gray-700">{skill}</span>
                    </label>
                  ))}
              </div>
              {allSkills.filter((s) => s.toLowerCase().includes(skillSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-xs sm:text-sm text-gray-500">No skills found for that search.</p>
              )}
            </div>

            {/* Custom skill */}
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
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
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm sm:text-base flex items-center justify-center sm:flex-initial"
              >
                <FaPlus />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Use search to quickly find skills across departments.</p>
          </div>

          {/* Department */}
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

          {/* Git Link (Optional) */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
              Git Repository Link (Optional)
            </label>
            <input
              type="url"
              value={formData.gitLink}
              onChange={(e) => setFormData({ ...formData, gitLink: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="https://github.com/username/repo"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 sm:pt-4">
            <button
              type="submit"
              className="w-full bg-amber-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-amber-600 transition font-medium text-sm sm:text-base"
            >
              Create Project
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
  const [replyingTo, setReplyingTo] = useState(null); // Format: "commentId" or "commentId-replyId"
  const [replyText, setReplyText] = useState('');
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const { addNotification } = useGlobal();
  const navigate = useNavigate();
  
  const isLiked = projectData.likes?.includes(userId);
  const hasJoined = projectData.participants?.some((p) => p.user?._id === userId || p.user === userId);
  const isOwner = projectData.createdBy?._id === userId || projectData.createdBy === userId;
  const hasPendingRequest = projectData.joinRequests?.some((r) => (r.user?._id === userId || r.user === userId) && r.status === 'pending');
  const pendingRequestsCount = projectData.joinRequests?.filter(r => r.status === 'pending').length || 0;

  // Calculate vote score for a comment or reply
  const getVoteScore = (item) => {
    if (!item) return 0;
    const upvotes = item.upvotes?.length || 0;
    const downvotes = item.downvotes?.length || 0;
    return upvotes - downvotes;
  };

  // Check if user has voted
  const getUserVote = (item) => {
    if (!userId || !item) return null;
    const hasUpvoted = item.upvotes?.some(id => 
      id === userId || id?._id === userId || id?.toString() === userId?.toString()
    );
    const hasDownvoted = item.downvotes?.some(id => 
      id === userId || id?._id === userId || id?.toString() === userId?.toString()
    );
    if (hasUpvoted) return 'upvote';
    if (hasDownvoted) return 'downvote';
    return null;
  };

  // Handle voting on comment
  const handleVoteComment = async (commentId, voteType) => {
    try {
      setLoading(true);
      const response = await projectAPI.voteComment(projectData._id, commentId, voteType);
      setProjectData(response.data);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to vote on comment'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle voting on reply
  const handleVoteReply = async (commentId, replyId, voteType) => {
    try {
      setLoading(true);
      const response = await projectAPI.voteReply(projectData._id, commentId, replyId, voteType);
      setProjectData(response.data);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to vote on reply'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await projectAPI.deleteComment(projectData._id, commentId);
      setProjectData(response.data);
      addNotification({
        type: 'success',
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to delete comment'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a reply
  const handleDeleteReply = async (commentId, replyId) => {
    if (!window.confirm('Are you sure you want to delete this reply? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await projectAPI.deleteReply(projectData._id, commentId, replyId);
      setProjectData(response.data);
      addNotification({
        type: 'success',
        message: 'Reply deleted successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to delete reply'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setLoading(true);
      const response = await projectAPI.addComment(projectData._id, { text: comment });
      // Ensure we have the full project data structure
      if (response.data) {
        setProjectData(response.data);
      } else {
        // Fallback: refresh the project data
        const refreshedProject = await projectAPI.getById(projectData._id);
        setProjectData(refreshedProject.data);
      }
      setComment('');
      addNotification({
        type: 'success',
        message: 'Comment added!',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      addNotification({
        type: 'error',
        message: 'Failed to add comment',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (commentId, parentReplyId = null) => {
    if (!replyText.trim()) return;

    try {
      setLoading(true);
      const response = await projectAPI.addReply(projectData._id, commentId, { text: replyText }, parentReplyId);
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
        message: error.message || 'Failed to add reply',
      });
    } finally {
      setLoading(false);
    }
  };

  // Recursive Reply Tree Component
  const ReplyTree = ({ reply, commentId, depth, userId, loading, projectStatus, onVote, onDelete, onReply, replyingTo, replyText, setReplyText, onAddReply, handleUserClick, formatRelativeTime, getVoteScore, getUserVote }) => {
    const replyVoteScore = getVoteScore(reply);
    const replyUserVote = getUserVote(reply);
    const isReplyUpvoted = replyUserVote === 'upvote';
    // Maximum depth is 2 (3 levels total: Comment -> Reply -> Reply -> Reply)
    // depth 0 = first level reply (can reply, creates depth 1)
    // depth 1 = second level reply (can reply, creates depth 2)
    // depth 2 = third level reply (cannot reply, max depth reached)
    const maxDepth = 2;
    const canReply = depth < maxDepth;
    const replyKey = `${commentId}-${reply._id}`;
    const isReplying = replyingTo === replyKey;
    
    return (
      <div
        className={`flex items-start ${depth > 0 ? 'ml-4 pl-4 border-l-2 border-gray-200' : ''}`}
        data-reply-id={reply._id}
      >
        {/* Reply Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleUserClick(reply.user?._id)}
                className="font-semibold text-xs text-gray-900 hover:text-amber-600 transition cursor-pointer"
              >
                {reply.user?.name || 'Unknown User'}
              </button>
              <span className="text-gray-500 text-xs">
                {formatRelativeTime(reply.createdAt)}
              </span>
            </div>
            {/* Delete button for reply owner */}
            {(reply.user?._id === userId || reply.user === userId) && (
              <button
                onClick={() => onDelete(commentId, reply._id)}
                disabled={loading}
                className="text-red-500 hover:text-red-700 transition p-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete reply"
              >
                <FaTrash className="text-xs" />
              </button>
            )}
          </div>
          <p className="text-amber-900 text-sm whitespace-pre-wrap leading-relaxed mb-2">{reply.text}</p>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
            {/* Vote Button */}
            <button
              onClick={() => onVote(commentId, reply._id, 'upvote')}
              disabled={loading || projectStatus === 'closed'}
              className={`flex items-center space-x-1.5 transition font-medium ${
                isReplyUpvoted 
                  ? 'text-orange-500 hover:text-orange-600' 
                  : 'text-gray-500 hover:text-orange-500'
              } ${projectStatus === 'closed' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title="Vote"
            >
              <FaThumbsUp className="text-xs" />
              <span>Vote</span>
              {replyVoteScore > 0 && <span className="text-xs">({replyVoteScore})</span>}
            </button>
            {/* Reply button */}
            {canReply && projectStatus !== 'closed' && (
              <button
                onClick={() => onReply(reply._id)}
                className="flex items-center space-x-1 hover:text-amber-600 transition font-medium"
              >
                <FaReply className="text-xs" />
                <span>Reply</span>
              </button>
            )}
          </div>
          
          {/* Reply Input */}
          {isReplying && (
            <div className="mt-2" style={{ direction: 'ltr', minHeight: '80px' }}>
              <textarea
                value={replyText}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setReplyText(e.target.value);
                  }
                }}
                placeholder="Write your reply... (max 200 characters)"
                dir="ltr"
                maxLength={200}
                className="w-full px-3 py-2 border border-amber-200/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none bg-white/60 backdrop-blur-sm text-sm"
                rows={2}
                autoFocus
                style={{ 
                  direction: 'ltr', 
                  textAlign: 'left',
                  unicodeBidi: 'embed',
                  writingMode: 'horizontal-tb'
                }}
                onFocus={(e) => {
                  const target = e.target;
                  target.setAttribute('dir', 'ltr');
                  target.style.direction = 'ltr';
                  target.style.textAlign = 'left';
                  // Ensure cursor is at the end
                  const len = target.value.length;
                  target.setSelectionRange(len, len);
                }}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onAddReply(commentId, reply._id);
                  }}
                  disabled={loading || !replyText.trim()}
                  className="px-4 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-xs font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPaperPlane className="text-xs" />
                  <span>Reply</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Nested Replies - Recursive */}
          {reply.replies && reply.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {reply.replies
                .sort((a, b) => {
                  const scoreA = getVoteScore(a);
                  const scoreB = getVoteScore(b);
                  return scoreB - scoreA;
                })
                .map((nestedReply, nestedIndex) => (
                  <ReplyTree
                    key={nestedReply._id || nestedIndex}
                    reply={nestedReply}
                    commentId={commentId}
                    depth={depth + 1}
                    userId={userId}
                    loading={loading}
                    projectStatus={projectStatus}
                    onVote={onVote}
                    onDelete={onDelete}
                    onReply={onReply}
                    replyingTo={replyingTo}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    onAddReply={onAddReply}
                    handleUserClick={handleUserClick}
                    formatRelativeTime={formatRelativeTime}
                    getVoteScore={getVoteScore}
                    getUserVote={getUserVote}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    );
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

  const handleSummarize = async () => {
    try {
      setSummarizing(true);
      const response = await projectAPI.summarize(projectData._id);
      setSummary(response.data.summary);
      setShowSummary(true);
      addNotification({
        type: 'success',
        message: 'Summary generated successfully using AI!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to generate summary. Please try again later.',
      });
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100">
      {/* Header with Back Button */}
      <div className="container mx-auto px-3 sm:px-4 pt-4 sm:pt-8 pb-4 max-w-7xl">
        <div className="flex justify-start items-center mb-4">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition text-sm sm:text-base"
          >
            <FaArrowLeft />
            <span>Back to Projects</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-3 sm:px-4 pb-4 sm:pb-8 max-w-7xl">
        <div className="bg-transparent rounded-lg p-4 sm:p-6 md:p-8 lg:p-10">
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
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex-1 pr-0 sm:pr-8">
                  {projectData.title}
                </h2>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(projectData.status)}`}>
                  {projectData.status}
                </span>
              </div>

              {/* Creator and Date */}
              <div className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                by <span className="font-medium">{projectData.createdBy?.name}</span> • {formatRelativeTime(projectData.createdAt)}
              </div>

              {/* Domains */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                {projectData.domains?.map((domain) => (
                  <span
                    key={domain}
                    className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getDomainColor(domain)}`}
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
                      className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-gray-600 text-xs sm:text-sm">
                <span className="flex items-center space-x-1 sm:space-x-2">
                  <FaHeart className="text-red-500 text-sm sm:text-base" />
                  <span>{projectData.likes?.length || 0} likes</span>
                </span>
                <span className="flex items-center space-x-1 sm:space-x-2">
                  <FaComment className="text-amber-500 text-sm sm:text-base" />
                  <span>{projectData.comments?.length || 0} comments</span>
                </span>
                <span className="flex items-center space-x-1 sm:space-x-2">
                  <FaUsers className="text-green-500 text-sm sm:text-base" />
                  <span>{projectData.participants?.length || 0} participants</span>
                </span>
              </div>
            </div>

            {/* Divider */}
            <hr className="my-6" />

            {/* Description */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">About this Project</h3>
                <button
                  onClick={handleSummarize}
                  disabled={summarizing}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium w-full sm:w-auto justify-center"
                  title="Generate AI summary using Google Gemini"
                >
                  {summarizing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Summarizing...</span>
                    </>
                  ) : (
                    <>
                      <FaMagic />
                      <span>Summarize with AI</span>
                    </>
                  )}
                </button>
              </div>
              
              {showSummary && summary && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-base font-semibold text-amber-900 flex items-center gap-2">
                      <FaMagic className="text-amber-600" />
                      AI Summary (Powered by Google Gemini)
                    </h4>
                    <button
                      onClick={() => setShowSummary(false)}
                      className="text-gray-400 hover:text-gray-600 transition"
                      title="Hide summary"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words text-base">{summary}</p>
                </motion.div>
              )}
              
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-amber-100/50">
                <p className={`text-gray-700 whitespace-pre-wrap leading-relaxed text-sm ${showSummary ? 'opacity-60' : ''}`}>
                  {projectData.description}
                </p>
              </div>
            </div>

            {/* Team Requirements */}
            {projectData.teamRequirements && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Team Requirements</h3>
                <p className="text-gray-700 text-sm">{projectData.teamRequirements}</p>
              </div>
            )}

            {/* Git Link */}
            {projectData.gitLink && (
              <div className="mb-6">
                <a
                  href={projectData.gitLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-amber-600 hover:text-amber-700 font-medium"
                >
                  <FaExternalLinkAlt />
                  <span>View Repository</span>
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6">
              {projectData.status !== 'closed' && (
                <button
                  onClick={handleLikeClick}
                  className={`flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 font-medium flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm ${
                    isLiked
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 shadow-sm'
                      : 'bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-amber-50/50 border border-amber-200/50 hover:border-amber-300/50'
                  }`}
                >
                  {isLiked ? (
                    <FaThumbsUp className="text-red-600 text-sm sm:text-base" />
                  ) : (
                    <FaThumbsUp className="text-gray-400 text-sm sm:text-base opacity-60" />
                  )}
                  <span>{isLiked ? 'Liked' : 'Like'}</span>
                </button>
              )}
              {projectData.status === 'open' && !hasJoined && !hasPendingRequest && !isOwner && (
                <button
                  onClick={handleJoinClick}
                  className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 font-medium flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm shadow-sm hover:shadow-md"
                >
                  <FaHandshake className="text-sm sm:text-base" />
                  <span>Request to Join</span>
                </button>
              )}
              {hasPendingRequest && !isOwner && (
                <button
                  disabled
                  className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 bg-yellow-100 text-yellow-700 rounded-lg font-medium flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                >
                  <FaHandshake className="text-sm sm:text-base" />
                  <span>Request Pending</span>
                </button>
              )}
              {hasJoined && !isOwner && (
                <button
                  disabled
                  className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 bg-green-100 text-green-600 rounded-lg font-medium flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                >
                  <FaCheck className="text-sm sm:text-base" />
                  <span>Joined</span>
                </button>
              )}
              {isOwner && projectData.status === 'open' && (
                <>
                  {pendingRequestsCount > 0 && (
                    <button
                      onClick={() => setShowJoinRequests(!showJoinRequests)}
                      className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 font-medium flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm shadow-sm hover:shadow-md"
                    >
                      <FaHandshake className="text-sm sm:text-base" />
                      <span>View Requests ({pendingRequestsCount})</span>
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await onComplete(projectData._id);
                      onClose();
                      onUpdate();
                    }}
                    className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                  >
                    <FaCheck className="text-sm sm:text-base" />
                    <span>Mark as Complete</span>
                  </button>
                </>
              )}
            </div>

            {/* Join Requests Management (for owner) */}
            {isOwner && showJoinRequests && pendingRequestsCount > 0 && (
              <div className="mb-8 bg-amber-50 rounded-lg p-4">
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
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                Discussion ({projectData.comments?.length || 0})
              </h3>

              {/* Add Comment Form - Reddit Style "Join Conversation" */}
              {projectData.status !== 'closed' ? (
                <div className="mb-4 sm:mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-amber-100/50">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Join the conversation</h4>
                  <form onSubmit={handleAddComment} style={{ direction: 'ltr' }}>
                    <textarea
                      value={comment}
                      onChange={(e) => {
                        setComment(e.target.value);
                      }}
                      placeholder="What are your thoughts?"
                      dir="ltr"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-amber-200/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none bg-white/60 backdrop-blur-sm text-sm sm:text-base"
                      rows={4}
                      style={{ 
                        direction: 'ltr', 
                        textAlign: 'left',
                        unicodeBidi: 'embed',
                        writingMode: 'horizontal-tb'
                      }}
                      onFocus={(e) => {
                        const target = e.target;
                        target.setAttribute('dir', 'ltr');
                        target.style.direction = 'ltr';
                        target.style.textAlign = 'left';
                        // Ensure cursor is at the end
                        const len = target.value.length;
                        target.setSelectionRange(len, len);
                      }}
                    />
                    <div className="flex justify-end mt-2 sm:mt-3">
                      <button
                        type="submit"
                        disabled={loading || !comment.trim()}
                        className="px-4 sm:px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      >
                        <FaPaperPlane />
                        <span>Comment</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-100 rounded-lg text-center">
                  <p className="text-gray-600 text-sm sm:text-base">
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
                  // Sort comments by vote score (top voted first)
                  [...(projectData.comments || [])]
                    .sort((a, b) => {
                      const scoreA = getVoteScore(a);
                      const scoreB = getVoteScore(b);
                      return scoreB - scoreA; // Descending order
                    })
                    .map((comment, index) => {
                      const voteScore = getVoteScore(comment);
                      const userVote = getUserVote(comment);
                      const isUpvoted = userVote === 'upvote';
                      const isDownvoted = userVote === 'downvote';
                      
                      return (
                    <motion.div
                      key={comment._id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition"
                      data-comment-id={comment._id}
                    >
                      {/* Comment Content */}
                      <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleUserClick(comment.user?._id)}
                                className="font-semibold text-sm text-gray-900 hover:text-amber-600 transition cursor-pointer"
                              >
                                {comment.user?.name || 'Unknown User'}
                              </button>
                              <span className="text-gray-500 text-xs">
                                {formatRelativeTime(comment.createdAt)}
                              </span>
                            </div>
                            {/* Delete button for comment owner */}
                            {(comment.user?._id === userId || comment.user === userId) && (
                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                disabled={loading}
                                className="text-red-500 hover:text-red-700 transition p-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete comment"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            )}
                          </div>
                          <p className="text-amber-900 whitespace-pre-wrap mb-3 leading-relaxed">{comment.text}</p>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {/* Vote Button */}
                            <button
                              onClick={() => handleVoteComment(comment._id, 'upvote')}
                              disabled={loading || projectData.status === 'closed'}
                              className={`flex items-center space-x-1.5 transition font-medium ${
                                isUpvoted 
                                  ? 'text-orange-500 hover:text-orange-600' 
                                  : 'text-gray-500 hover:text-orange-500'
                              } ${projectData.status === 'closed' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              title="Vote"
                            >
                              <FaThumbsUp className="text-xs" />
                              <span>Vote</span>
                              {voteScore > 0 && <span className="text-xs">({voteScore})</span>}
                            </button>
                            {projectData.status !== 'closed' && comment._id && (
                              <button
                                onClick={() => {
                                  setReplyingTo(comment._id);
                                  setReplyText('');
                                }}
                                className="flex items-center space-x-1 hover:text-amber-600 transition font-medium"
                              >
                                <FaReply className="text-xs" />
                                <span>Reply</span>
                              </button>
                            )}
                            <span className="flex items-center space-x-1">
                              <FaComment className="text-xs" />
                              <span>{comment.replies?.length || 0} replies</span>
                            </span>
                          </div>

                          {/* Reply Input */}
                          {replyingTo === comment._id && comment._id && (
                            <div className="mt-3" style={{ direction: 'ltr', minHeight: '80px' }}>
                              <textarea
                                value={replyText}
                                onChange={(e) => {
                                  if (e.target.value.length <= 200) {
                                    setReplyText(e.target.value);
                                  }
                                }}
                                placeholder="Write your reply... (max 200 characters)"
                                dir="ltr"
                                maxLength={200}
                                className="w-full px-3 py-2 border border-amber-200/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none bg-white/60 backdrop-blur-sm"
                                rows={2}
                                autoFocus
                                style={{ 
                                  direction: 'ltr', 
                                  textAlign: 'left',
                                  unicodeBidi: 'embed',
                                  writingMode: 'horizontal-tb'
                                }}
                                onFocus={(e) => {
                                  const target = e.target;
                                  target.setAttribute('dir', 'ltr');
                                  target.style.direction = 'ltr';
                                  target.style.textAlign = 'left';
                                  // Ensure cursor is at the end
                                  const len = target.value.length;
                                  target.setSelectionRange(len, len);
                                }}
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
                                  className="px-4 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FaPaperPlane className="text-xs" />
                                  <span>Reply</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Recursive Reply Tree */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-4 space-y-3">
                              {comment.replies
                                .sort((a, b) => {
                                  const scoreA = getVoteScore(a);
                                  const scoreB = getVoteScore(b);
                                  return scoreB - scoreA;
                                })
                                .map((reply, replyIndex) => (
                                  <ReplyTree
                                    key={reply._id || replyIndex}
                                    reply={reply}
                                    commentId={comment._id}
                                    depth={0}
                                    userId={userId}
                                    loading={loading}
                                    projectStatus={projectData.status}
                                    onVote={handleVoteReply}
                                    onDelete={handleDeleteReply}
                                    onReply={(parentReplyId) => {
                                      setReplyingTo(`${comment._id}-${parentReplyId}`);
                                      setReplyText('');
                                    }}
                                    replyingTo={replyingTo}
                                    replyText={replyText}
                                    setReplyText={setReplyText}
                                    onAddReply={handleAddReply}
                                    handleUserClick={handleUserClick}
                                    formatRelativeTime={formatRelativeTime}
                                    getVoteScore={getVoteScore}
                                    getUserVote={getUserVote}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                    </motion.div>
                  );
                  })
                )}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Projects;

