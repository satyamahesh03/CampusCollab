import { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { useGlobal } from '../context/GlobalContext';
import Loading from '../components/Loading';
import { FaUsers, FaProjectDiagram, FaFlag, FaBan, FaCheck, FaChevronDown, FaChevronRight, FaEye, FaEyeSlash, FaSearch } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { formatRelativeTime, getStatusColor, formatDate } from '../utils/helpers';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [content, setContent] = useState({ projects: [], internships: [], hackathons: [], drives: [], courses: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSection, setExpandedSection] = useState(null);
  const [contentFilters, setContentFilters] = useState({
    projects: 'active',
    internships: 'active',
    hackathons: 'active',
    drives: 'active',
  });
  const [confirmingDelete, setConfirmingDelete] = useState(null); // { type, id }
  const [contentSearch, setContentSearch] = useState(''); // Search query for content
  const [userSearch, setUserSearch] = useState(''); // Search query for users
  const { addNotification } = useGlobal();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, reportsRes, usersRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getReports({ status: 'pending' }),
        adminAPI.getUsers({}),
      ]);
      setStats(dashboardRes.data);
      setReports(reportsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to fetch dashboard data' });
    } finally {
      setLoading(false);
    }
  };

  const fetchContentByType = async (type, filter) => {
    try {
      let params = {};
      
      if (type === 'projects') {
        params.status = filter;
        const response = await adminAPI.getProjects(params);
        setContent(prev => ({ ...prev, projects: response.data || [] }));
      } else if (type === 'internships') {
        const response = await adminAPI.getInternships({});
        setContent(prev => ({ ...prev, internships: response.data || [] }));
      } else if (type === 'hackathons') {
        const response = await adminAPI.getHackathons({});
        setContent(prev => ({ ...prev, hackathons: response.data || [] }));
      } else if (type === 'drives') {
        params.status = filter;
        const response = await adminAPI.getDrives(params);
        setContent(prev => ({ ...prev, drives: response.data || [] }));
      } else if (type === 'courses') {
        const response = await adminAPI.getCourseLinks({});
        setContent(prev => ({ ...prev, courses: response.data || [] }));
      }
    } catch (error) {
      addNotification({ type: 'error', message: `Failed to fetch ${type}` });
    }
  };

  const handleSectionClick = async (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      await fetchContentByType(section, contentFilters[section] || 'active');
    }
  };

  const handleFilterChange = async (type, filter) => {
    setContentFilters(prev => ({ ...prev, [type]: filter }));
    await fetchContentByType(type, filter);
  };

  const handleSuspendUser = async (userId, reason) => {
    try {
      await adminAPI.suspendUser(userId, { reason });
      fetchDashboardData();
      addNotification({ type: 'success', message: 'User status updated' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to update user status' });
    }
  };

  const handleReviewReport = async (reportId, status, action) => {
    try {
      await adminAPI.reviewReport(reportId, { status, actionTaken: action });
      fetchDashboardData();
      addNotification({ type: 'success', message: 'Report reviewed' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to review report' });
    }
  };

  const handleDeleteClick = (type, id, e) => {
    e.stopPropagation();
    setConfirmingDelete({ type, id });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmingDelete) return;
    
    const { type, id } = confirmingDelete;
    setConfirmingDelete(null);
    
    try {
      switch(type) {
        case 'project':
          await adminAPI.deleteProject(id);
          break;
        case 'internship':
          await adminAPI.deleteInternship(id);
          break;
        case 'hackathon':
          await adminAPI.deleteHackathon(id);
          break;
        case 'drive':
          await adminAPI.deleteDrive(id);
          break;
        case 'course':
          await adminAPI.deleteCourseLink(id);
          break;
      }
      // Refresh the current expanded section
      if (expandedSection) {
        await fetchContentByType(expandedSection, contentFilters[expandedSection]);
      }
      addNotification({ type: 'success', message: 'Content deleted successfully' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to delete content' });
    }
  };

  const handleDeleteCancel = () => {
    setConfirmingDelete(null);
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!userSearch.trim()) return true;
    const searchLower = userSearch.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  // Filter content based on search query
  const filterContent = (items, type) => {
    if (!contentSearch.trim()) return items;
    const searchLower = contentSearch.toLowerCase();
    return items.filter((item) => {
      const title = item.title || item.name || '';
      return title.toLowerCase().includes(searchLower);
    });
  };

  const handleHideContent = async (type, id) => {
    try {
      switch(type) {
        case 'project':
          await adminAPI.hideProject(id);
          break;
        case 'internship':
          await adminAPI.hideInternship(id);
          break;
        case 'hackathon':
          await adminAPI.hideHackathon(id);
          break;
        case 'drive':
          await adminAPI.hideDrive(id);
          break;
        case 'course':
          await adminAPI.hideCourseLink(id);
          break;
      }
      // Refresh the current expanded section
      if (expandedSection) {
        await fetchContentByType(expandedSection, contentFilters[expandedSection]);
      }
      addNotification({ type: 'success', message: 'Content visibility updated successfully' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to update content visibility' });
    }
  };

  if (loading) return <Loading text="Loading dashboard..." />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100">
      <div className="bg-amber-50/60 backdrop-blur-sm border-b border-amber-100/50">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:space-x-1 mb-6 sm:mb-8 bg-amber-50/60 backdrop-blur-sm rounded-lg border border-amber-100/50 p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[calc(50%-0.125rem)] sm:min-w-0 py-1.5 px-2 sm:px-3 rounded-md font-medium transition text-xs sm:text-sm ${activeTab === 'overview' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-amber-100'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 min-w-[calc(50%-0.125rem)] sm:min-w-0 py-1.5 px-2 sm:px-3 rounded-md font-medium transition text-xs sm:text-sm ${activeTab === 'content' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-amber-100'}`}
          >
            <span className="hidden sm:inline">Content Management</span>
            <span className="sm:hidden">Content</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 min-w-[calc(50%-0.125rem)] sm:min-w-0 py-1.5 px-2 sm:px-3 rounded-md font-medium transition text-xs sm:text-sm ${activeTab === 'reports' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-amber-100'}`}
          >
            Reports {stats?.reports?.pending > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded-full">{stats.reports.pending}</span>}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-[calc(50%-0.125rem)] sm:min-w-0 py-1.5 px-2 sm:px-3 rounded-md font-medium transition text-xs sm:text-sm ${activeTab === 'users' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-amber-100'}`}
          >
            Users
          </button>
        </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <StatCard
              icon={<FaUsers className="text-3xl text-amber-600" />}
              title="Total Users"
              value={stats.users?.total || 0}
              subtitle={`${stats.users?.students} students, ${stats.users?.faculty} faculty`}
            />
            <StatCard
              icon={<FaProjectDiagram className="text-3xl text-green-600" />}
              title="Projects"
              value={stats.content?.projects || 0}
              subtitle={`${stats.content?.activeProjects} active`}
            />
            <StatCard
              icon={<FaFlag className="text-3xl text-red-600" />}
              title="Pending Reports"
              value={stats.reports?.pending || 0}
              subtitle={`${stats.reports?.total} total`}
            />
            <StatCard
              icon={<FaBan className="text-3xl text-orange-600" />}
              title="Suspended Users"
              value={stats.users?.suspended || 0}
              subtitle="Require attention"
            />
          </div>

          {/* Recent Reports */}
          <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Recent Reports</h2>
            <div className="space-y-3 sm:space-y-4">
              {stats.recentReports?.slice(0, 5).map((report) => (
                <div key={report._id} className="border-b border-amber-200 pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm sm:text-base">{report.reportedUser?.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{report.reason}</p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(report.createdAt)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(report.status)} self-start sm:self-auto`}>
                      {report.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Management Tab */}
      {activeTab === 'content' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">Manage All Content</h2>
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search by title..."
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-amber-50 focus:border focus:border-amber-300 rounded-lg focus:outline-none focus:ring-amber-300"
              />
            </div>
          </div>
          
          {/* Projects Section */}
          <ContentSection
            title="Projects"
            type="projects"
            expanded={expandedSection === 'projects'}
            onToggle={() => handleSectionClick('projects')}
            filter={contentFilters.projects}
            onFilterChange={(filter) => handleFilterChange('projects', filter)}
            hasFilters={true}
          >
            {expandedSection === 'projects' && (
              <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-amber-50/50">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Title</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Creator</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filterContent(content.projects, 'project').map((project) => (
                        <tr key={project._id} className="hover:bg-amber-50/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{project.title}</span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleHideContent('project', project._id)}
                                  className={`${project.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                                  title={project.isHidden ? 'Unhide' : 'Hide'}
                                >
                                  {project.isHidden ? <FaEye /> : <FaEyeSlash />}
                                </button>
                                {confirmingDelete?.type === 'project' && confirmingDelete?.id === project._id ? (
                                  <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                                    <button
                                      onClick={handleDeleteConfirm}
                                      className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={handleDeleteCancel}
                                      className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => handleDeleteClick('project', project._id, e)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded transition-all hover:scale-110"
                                    title="Delete"
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} className="transition-transform" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{project.createdBy?.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(project.status)}`}>
                              {project.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${project.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {project.isHidden ? 'Hidden' : 'Visible'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-amber-200">
                  {filterContent(content.projects, 'project').map((project) => (
                    <div key={project._id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm text-gray-900">{project.title}</div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleHideContent('project', project._id)}
                            className={`${project.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                            title={project.isHidden ? 'Unhide' : 'Hide'}
                          >
                            {project.isHidden ? <FaEye /> : <FaEyeSlash />}
                          </button>
                          {confirmingDelete?.type === 'project' && confirmingDelete?.id === project._id ? (
                            <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                              <button
                                onClick={handleDeleteConfirm}
                                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleDeleteClick('project', project._id, e)}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-all"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrashCan} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">By: {project.createdBy?.name}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${project.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {project.isHidden ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ContentSection>

          {/* Internships Section */}
          <ContentSection
            title="Internships"
            type="internships"
            expanded={expandedSection === 'internships'}
            onToggle={() => handleSectionClick('internships')}
            hasFilters={false}
          >
            {expandedSection === 'internships' && (
              <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-amber-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Company</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Deadline</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filterContent(content.internships, 'internship').map((internship) => (
                        <tr key={internship._id} className="hover:bg-amber-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{internship.title}</span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleHideContent('internship', internship._id)}
                                  className={`${internship.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                                  title={internship.isHidden ? 'Unhide' : 'Hide'}
                                >
                                  {internship.isHidden ? <FaEye /> : <FaEyeSlash />}
                                </button>
                                {confirmingDelete?.type === 'internship' && confirmingDelete?.id === internship._id ? (
                                  <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                                    <button
                                      onClick={handleDeleteConfirm}
                                      className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={handleDeleteCancel}
                                      className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => handleDeleteClick('internship', internship._id, e)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded transition-all hover:scale-110"
                                    title="Delete"
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} className="transition-transform" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{internship.company}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(internship.applicationDeadline)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${internship.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {internship.isHidden ? 'Hidden' : 'Visible'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-amber-200">
                  {filterContent(content.internships, 'internship').map((internship) => (
                    <div key={internship._id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm text-gray-900">{internship.title}</div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleHideContent('internship', internship._id)}
                            className={`${internship.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                            title={internship.isHidden ? 'Unhide' : 'Hide'}
                          >
                            {internship.isHidden ? <FaEye /> : <FaEyeSlash />}
                          </button>
                          {confirmingDelete?.type === 'internship' && confirmingDelete?.id === internship._id ? (
                            <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                              <button
                                onClick={handleDeleteConfirm}
                                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleDeleteClick('internship', internship._id, e)}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-all"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrashCan} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">Company: {internship.company}</div>
                      <div className="text-xs text-gray-600">Deadline: {formatDate(internship.applicationDeadline)}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${internship.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {internship.isHidden ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ContentSection>

          {/* Hackathons Section */}
          <ContentSection
            title="Hackathons"
            type="hackathons"
            expanded={expandedSection === 'hackathons'}
            onToggle={() => handleSectionClick('hackathons')}
            hasFilters={false}
          >
            {expandedSection === 'hackathons' && (
              <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-amber-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Organizer</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filterContent(content.hackathons, 'hackathon').map((hackathon) => (
                        <tr key={hackathon._id} className="hover:bg-amber-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{hackathon.title}</span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleHideContent('hackathon', hackathon._id)}
                                  className={`${hackathon.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                                  title={hackathon.isHidden ? 'Unhide' : 'Hide'}
                                >
                                  {hackathon.isHidden ? <FaEye /> : <FaEyeSlash />}
                                </button>
                                {confirmingDelete?.type === 'hackathon' && confirmingDelete?.id === hackathon._id ? (
                                  <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                                    <button
                                      onClick={handleDeleteConfirm}
                                      className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={handleDeleteCancel}
                                      className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => handleDeleteClick('hackathon', hackathon._id, e)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded transition-all hover:scale-110"
                                    title="Delete"
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} className="transition-transform" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{hackathon.organizer}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(hackathon.startDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${hackathon.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {hackathon.isHidden ? 'Hidden' : 'Visible'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-amber-200">
                  {filterContent(content.hackathons, 'hackathon').map((hackathon) => (
                    <div key={hackathon._id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm text-gray-900">{hackathon.title}</div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleHideContent('hackathon', hackathon._id)}
                            className={`${hackathon.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                            title={hackathon.isHidden ? 'Unhide' : 'Hide'}
                          >
                            {hackathon.isHidden ? <FaEye /> : <FaEyeSlash />}
                          </button>
                          {confirmingDelete?.type === 'hackathon' && confirmingDelete?.id === hackathon._id ? (
                            <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                              <button
                                onClick={handleDeleteConfirm}
                                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleDeleteClick('hackathon', hackathon._id, e)}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-all"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrashCan} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">Organizer: {hackathon.organizer}</div>
                      <div className="text-xs text-gray-600">Date: {formatDate(hackathon.startDate)}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${hackathon.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {hackathon.isHidden ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ContentSection>

          {/* Drives Section */}
          <ContentSection
            title="Placement Drives"
            type="drives"
            expanded={expandedSection === 'drives'}
            onToggle={() => handleSectionClick('drives')}
            filter={contentFilters.drives}
            onFilterChange={(filter) => handleFilterChange('drives', filter)}
            hasFilters={true}
          >
            {expandedSection === 'drives' && (
              <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-amber-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Company</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Package</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filterContent(content.drives, 'drive').map((drive) => (
                        <tr key={drive._id} className="hover:bg-amber-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{drive.title || 'N/A'}</span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleHideContent('drive', drive._id)}
                                  className={`${drive.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                                  title={drive.isHidden ? 'Unhide' : 'Hide'}
                                >
                                  {drive.isHidden ? <FaEye /> : <FaEyeSlash />}
                                </button>
                                {confirmingDelete?.type === 'drive' && confirmingDelete?.id === drive._id ? (
                                  <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                                    <button
                                      onClick={handleDeleteConfirm}
                                      className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={handleDeleteCancel}
                                      className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => handleDeleteClick('drive', drive._id, e)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded transition-all hover:scale-110"
                                    title="Delete"
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} className="transition-transform" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{drive.company}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{drive.jobRole}</td>
                          <td className="px-4 py-3 text-sm">{drive.package}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(drive.driveDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${drive.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {drive.isHidden ? 'Hidden' : 'Visible'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-amber-200">
                  {filterContent(content.drives, 'drive').map((drive) => (
                    <div key={drive._id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm text-gray-900">{drive.title || 'N/A'}</div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleHideContent('drive', drive._id)}
                            className={`${drive.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                            title={drive.isHidden ? 'Unhide' : 'Hide'}
                          >
                            {drive.isHidden ? <FaEye /> : <FaEyeSlash />}
                          </button>
                          {confirmingDelete?.type === 'drive' && confirmingDelete?.id === drive._id ? (
                            <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                              <button
                                onClick={handleDeleteConfirm}
                                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleDeleteClick('drive', drive._id, e)}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-all"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrashCan} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">Company: {drive.company}</div>
                      <div className="text-xs text-gray-600">Role: {drive.jobRole}</div>
                      <div className="text-xs text-gray-600">Package: {drive.package}</div>
                      <div className="text-xs text-gray-600">Date: {formatDate(drive.driveDate)}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${drive.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {drive.isHidden ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ContentSection>

          {/* Course Links Section */}
          <ContentSection
            title="Course Resources"
            type="courses"
            expanded={expandedSection === 'courses'}
            onToggle={() => handleSectionClick('courses')}
            hasFilters={false}
          >
            {expandedSection === 'courses' && (
              <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-amber-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filterContent(content.courses, 'course').map((course) => (
                        <tr key={course._id} className="hover:bg-amber-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{course.title}</span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleHideContent('course', course._id)}
                                  className={`${course.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                                  title={course.isHidden ? 'Unhide' : 'Hide'}
                                >
                                  {course.isHidden ? <FaEye /> : <FaEyeSlash />}
                                </button>
                                {confirmingDelete?.type === 'course' && confirmingDelete?.id === course._id ? (
                                  <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                                    <button
                                      onClick={handleDeleteConfirm}
                                      className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={handleDeleteCancel}
                                      className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => handleDeleteClick('course', course._id, e)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded transition-all hover:scale-110"
                                    title="Delete"
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} className="transition-transform" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{course.category}</td>
                          <td className="px-4 py-3 text-sm">{course.department}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${course.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {course.isHidden ? 'Hidden' : 'Visible'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-amber-200">
                  {filterContent(content.courses, 'course').map((course) => (
                    <div key={course._id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm text-gray-900">{course.title}</div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleHideContent('course', course._id)}
                            className={`${course.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-1 hover:bg-amber-100 rounded`}
                            title={course.isHidden ? 'Unhide' : 'Hide'}
                          >
                            {course.isHidden ? <FaEye /> : <FaEyeSlash />}
                          </button>
                          {confirmingDelete?.type === 'course' && confirmingDelete?.id === course._id ? (
                            <div className="flex items-center gap-1 bg-white border border-red-300 rounded px-1 py-0.5 shadow-sm">
                              <button
                                onClick={handleDeleteConfirm}
                                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleDeleteClick('course', course._id, e)}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-all"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrashCan} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">Category: {course.category}</div>
                      <div className="text-xs text-gray-600">Department: {course.department}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${course.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {course.isHidden ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ContentSection>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3 sm:space-y-4">
          {reports.length === 0 ? (
            <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-8 sm:p-12 text-center">
              <p className="text-gray-500 text-sm sm:text-base">No pending reports</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report._id} className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                      Report against {report.reportedUser?.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">{report.reportedUser?.email}</p>
                  </div>
                  <span className={`px-2 sm:px-3 py-1 rounded text-xs font-medium ${getStatusColor(report.status)} self-start sm:self-auto`}>
                    {report.status}
                  </span>
                </div>
                <div className="bg-amber-100 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4 border border-amber-200">
                  <p className="text-xs sm:text-sm text-gray-700"><strong>Reason:</strong> {report.reason}</p>
                  <p className="text-xs sm:text-sm text-gray-700 mt-2"><strong>Content:</strong> {report.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Reported {formatRelativeTime(report.createdAt)}
                  </p>
                </div>
                {report.status === 'pending' && (
                  <div className="flex flex-row flex-wrap gap-1.5">
                    <button
                      onClick={() => handleReviewReport(report._id, 'action-taken', 'User warned')}
                      className="bg-yellow-500 text-white py-1 px-2 rounded text-xs font-medium hover:bg-yellow-600 transition"
                    >
                      Warn User
                    </button>
                    <button
                      onClick={() => handleSuspendUser(report.reportedUser._id, report.reason)}
                      className="bg-red-600 text-white py-1 px-2 rounded text-xs font-medium hover:bg-red-700 transition"
                    >
                      Suspend User
                    </button>
                    <button
                      onClick={() => handleReviewReport(report._id, 'dismissed', 'False alarm')}
                      className="bg-amber-500 text-white py-1 px-2 rounded text-xs font-medium hover:bg-amber-600 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">Users</h2>
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-amber-50 focus:border focus:border-amber-300 rounded-lg focus:outline-none focus:ring-amber-300"
              />
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.slice(0, 20).map((user) => (
                  <tr key={user._id} className="hover:bg-amber-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${user.isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {user.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                {user.role !== 'admin' && (
                  <button
                    onClick={() => handleSuspendUser(user._id, 'Admin action')}
                    className={`text-xs px-2 py-0.5 rounded font-medium transition ${user.isSuspended ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                  >
                    {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                )}
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-amber-200">
            {filteredUsers.slice(0, 20).map((user) => (
              <div key={user._id} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm text-gray-900">{user.name}</div>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleSuspendUser(user._id, 'Admin action')}
                      className={`text-xs px-2 py-0.5 rounded font-medium transition ${user.isSuspended ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                    >
                      {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-600">{user.email}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 capitalize">
                    {user.role}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${user.isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {user.isSuspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle }) => (
  <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-4 sm:p-6 hover:shadow-md transition">
    <div className="flex items-center justify-between mb-2 sm:mb-3">
      <div className="text-2xl sm:text-4xl">{icon}</div>
      <div className="text-right">
        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
    <div className="text-xs sm:text-sm font-medium text-gray-700 mb-1">{title}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
  </div>
);

const ContentSection = ({ title, type, expanded, onToggle, filter, onFilterChange, hasFilters, children }) => (
  <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 overflow-hidden">
    {/* Section Header - Clickable */}
    <div 
      onClick={onToggle}
      className="p-3 sm:p-4 bg-amber-100 hover:bg-amber-200 transition cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-200"
    >
      <div className="flex items-center space-x-2 sm:space-x-3">
        {expanded ? <FaChevronDown className="text-amber-600 text-sm sm:text-base" /> : <FaChevronRight className="text-gray-400 text-sm sm:text-base" />}
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {expanded && hasFilters && (
        <div className="flex space-x-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onFilterChange('active')}
            className={`px-2 py-1 rounded text-xs font-medium transition ${
              filter === 'active'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-200 text-gray-700 hover:bg-amber-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => onFilterChange('completed')}
            className={`px-2 py-1 rounded text-xs font-medium transition ${
              filter === 'completed'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-200 text-gray-700 hover:bg-amber-300'
            }`}
          >
            Completed
          </button>
        </div>
      )}
    </div>
    
    {/* Section Content */}
    {expanded && (
      <div className="p-3 sm:p-4">
        {children}
      </div>
    )}
  </div>
);

export default AdminDashboard;

