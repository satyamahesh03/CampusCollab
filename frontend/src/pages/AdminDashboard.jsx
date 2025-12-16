import { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { useGlobal } from '../context/GlobalContext';
import Loading from '../components/Loading';
import { FaUsers, FaProjectDiagram, FaFlag, FaBan, FaCheck, FaTrash, FaChevronDown, FaChevronRight, FaEye, FaEyeSlash } from 'react-icons/fa';
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

  const handleDeleteContent = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white rounded-lg shadow-sm p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${activeTab === 'content' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Content Management
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Reports {stats?.reports?.pending > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.reports.pending}</span>}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Users
          </button>
        </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<FaUsers className="text-3xl text-blue-600" />}
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
            <div className="space-y-4">
              {stats.recentReports?.slice(0, 5).map((report) => (
                <div key={report._id} className="border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{report.reportedUser?.name}</p>
                      <p className="text-sm text-gray-600">{report.reason}</p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(report.createdAt)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(report.status)}`}>
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
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-6">Manage All Content</h2>
          
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
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Creator</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {content.projects.map((project) => (
                      <tr key={project._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{project.title}</td>
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
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleHideContent('project', project._id)}
                              className={`${project.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-2 hover:bg-gray-100 rounded`}
                              title={project.isHidden ? 'Unhide' : 'Hide'}
                            >
                              {project.isHidden ? <FaEye /> : <FaEyeSlash />}
                            </button>
                            <button
                              onClick={() => handleDeleteContent('project', project._id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Company</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Deadline</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {content.internships.map((internship) => (
                      <tr key={internship._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{internship.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{internship.company}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(internship.applicationDeadline)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${internship.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {internship.isHidden ? 'Hidden' : 'Visible'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleHideContent('internship', internship._id)}
                              className={`${internship.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-2 hover:bg-gray-100 rounded`}
                              title={internship.isHidden ? 'Unhide' : 'Hide'}
                            >
                              {internship.isHidden ? <FaEye /> : <FaEyeSlash />}
                            </button>
                            <button
                              onClick={() => handleDeleteContent('internship', internship._id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Organizer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {content.hackathons.map((hackathon) => (
                      <tr key={hackathon._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{hackathon.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{hackathon.organizer}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(hackathon.startDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${hackathon.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {hackathon.isHidden ? 'Hidden' : 'Visible'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleHideContent('hackathon', hackathon._id)}
                              className={`${hackathon.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-2 hover:bg-gray-100 rounded`}
                              title={hackathon.isHidden ? 'Unhide' : 'Hide'}
                            >
                              {hackathon.isHidden ? <FaEye /> : <FaEyeSlash />}
                            </button>
                            <button
                              onClick={() => handleDeleteContent('hackathon', hackathon._id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Company</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Package</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {content.drives.map((drive) => (
                      <tr key={drive._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{drive.title || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{drive.company}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{drive.jobRole}</td>
                        <td className="px-4 py-3 text-sm">{drive.package}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(drive.driveDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${drive.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {drive.isHidden ? 'Hidden' : 'Visible'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleHideContent('drive', drive._id)}
                              className={`${drive.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-2 hover:bg-gray-100 rounded`}
                              title={drive.isHidden ? 'Unhide' : 'Hide'}
                            >
                              {drive.isHidden ? <FaEye /> : <FaEyeSlash />}
                            </button>
                            <button
                              onClick={() => handleDeleteContent('drive', drive._id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visibility</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {content.courses.map((course) => (
                      <tr key={course._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{course.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{course.category}</td>
                        <td className="px-4 py-3 text-sm">{course.department}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${course.isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {course.isHidden ? 'Hidden' : 'Visible'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleHideContent('course', course._id)}
                              className={`${course.isHidden ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} p-2 hover:bg-gray-100 rounded`}
                              title={course.isHidden ? 'Unhide' : 'Hide'}
                            >
                              {course.isHidden ? <FaEye /> : <FaEyeSlash />}
                            </button>
                            <button
                              onClick={() => handleDeleteContent('course', course._id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentSection>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No pending reports</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      Report against {report.reportedUser?.name}
                    </h3>
                    <p className="text-sm text-gray-600">{report.reportedUser?.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-100">
                  <p className="text-sm text-gray-700"><strong>Reason:</strong> {report.reason}</p>
                  <p className="text-sm text-gray-700 mt-2"><strong>Content:</strong> {report.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Reported {formatRelativeTime(report.createdAt)}
                  </p>
                </div>
                {report.status === 'pending' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleReviewReport(report._id, 'action-taken', 'User warned')}
                      className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-600 transition"
                    >
                      Warn User
                    </button>
                    <button
                      onClick={() => handleSuspendUser(report.reportedUser._id, report.reason)}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition"
                    >
                      Suspend User
                    </button>
                    <button
                      onClick={() => handleReviewReport(report._id, 'dismissed', 'False alarm')}
                      className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition"
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.slice(0, 20).map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
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
                        className={`text-sm px-4 py-1.5 rounded-lg font-medium transition ${user.isSuspended ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
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
      )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
    <div className="flex items-center justify-between mb-3">
      <div className="text-4xl">{icon}</div>
      <div className="text-right">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
    <div className="text-sm font-medium text-gray-700 mb-1">{title}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
  </div>
);

const ContentSection = ({ title, type, expanded, onToggle, filter, onFilterChange, hasFilters, children }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    {/* Section Header - Clickable */}
    <div 
      onClick={onToggle}
      className="p-4 bg-gray-50 hover:bg-gray-100 transition cursor-pointer flex items-center justify-between border-b"
    >
      <div className="flex items-center space-x-3">
        {expanded ? <FaChevronDown className="text-blue-600" /> : <FaChevronRight className="text-gray-400" />}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {expanded && hasFilters && (
        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onFilterChange('active')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => onFilterChange('completed')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Completed
          </button>
        </div>
      )}
    </div>
    
    {/* Section Content */}
    {expanded && (
      <div className="p-4">
        {children}
      </div>
    )}
  </div>
);

export default AdminDashboard;

