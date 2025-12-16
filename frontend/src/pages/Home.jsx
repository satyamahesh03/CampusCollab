import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { projectAPI, hackathonAPI, internshipAPI, driveAPI, courseLinkAPI, statsAPI } from '../utils/api';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Code, 
  GraduationCap, 
  BookOpen, 
  Lightbulb, 
  TrendingUp,
  MessageCircle,
  Calendar,
  ArrowRight,
  Sparkles,
  Heart,
  Bell,
  Zap,
  Target,
  Award,
  BarChart3
} from 'lucide-react';
import { getDomainColor, formatDate } from '../utils/helpers';
import { FaUsers, FaComment } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const [trendingProjects, setTrendingProjects] = useState([]);
  const [upcomingDrives, setUpcomingDrives] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [statsPeriod, setStatsPeriod] = useState('month'); // 'week' or 'month'
  const [postedStats, setPostedStats] = useState({
    projects: 0,
    internships: 0,
    hackathons: 0,
    drives: 0,
    courses: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [activeCategories, setActiveCategories] = useState({
    Projects: true,
    Internships: true,
    Hackathons: true,
    Drives: true,
    Courses: true,
  });
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalHackathons: 0,
    totalInternships: 0,
    totalDrives: 0,
    totalResources: 0,
  });

  useEffect(() => {
    fetchAllData();
  }, [isAuthenticated]);

  useEffect(() => {
    fetchStats();
  }, [statsPeriod]);

  const fetchAllData = async () => {
    try {
      // Fetch trending projects if authenticated
      if (isAuthenticated) {
        const projectsResponse = await projectAPI.getAll({ sort: 'trending', status: 'open' });
        setTrendingProjects(projectsResponse.data.slice(0, 3));
      }
      
      // Fetch upcoming drives (only 3)
      const drivesResponse = await driveAPI.getAll({});
      const upcoming = (drivesResponse.data || [])
        .filter(drive => new Date(drive.driveDate) >= new Date())
        .sort((a, b) => new Date(a.driveDate) - new Date(b.driveDate))
        .slice(0, 3);
      setUpcomingDrives(upcoming);
      
      // Fetch comprehensive stats data
      const [
        allProjects, 
        openProjects, 
        closedProjects,
        hackathons, 
        internships, 
        drives, 
        courses
      ] = await Promise.all([
        projectAPI.getAll({}),
        projectAPI.getAll({ status: 'open' }),
        projectAPI.getAll({ status: 'closed' }),
        hackathonAPI.getAll({}),
        internshipAPI.getAll({}),
        driveAPI.getAll({}),
        courseLinkAPI.getAll({}),
      ]);

      setStats({
        totalProjects: allProjects.count || allProjects.data?.length || 0,
        activeProjects: openProjects.count || openProjects.data?.length || 0,
        completedProjects: closedProjects.count || closedProjects.data?.length || 0,
        totalHackathons: hackathons.count || hackathons.data?.length || 0,
        totalInternships: internships.count || internships.data?.length || 0,
        totalDrives: drives.count || drives.data?.length || 0,
        totalResources: courses.count || courses.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await statsAPI.getPublicStats(statsPeriod);
      setTotalUsers(response.data.totalUsers);
      setPostedStats(response.data.postedStats);
      setChartData(response.data.chartData || []);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const toggleCategory = (category) => {
    setActiveCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const features = [
    {
      icon: <Briefcase className="text-blue-600" size={32} />,
      title: 'Collaborative Projects',
      description: 'Find team members and collaborate on innovative projects across departments.',
      link: '/projects',
      color: 'from-blue-50 to-blue-100',
      iconBg: 'bg-blue-100',
    },
    {
      icon: <Briefcase className="text-green-600" size={32} />,
      title: 'Internships',
      description: 'Discover internship opportunities posted by faculty and industry partners.',
      link: '/internships',
      color: 'from-green-50 to-green-100',
      iconBg: 'bg-green-100',
    },
    {
      icon: <Code className="text-purple-600" size={32} />,
      title: 'Hackathons',
      description: 'Stay updated with the latest hackathons and coding competitions.',
      link: '/hackathons',
      color: 'from-purple-50 to-purple-100',
      iconBg: 'bg-purple-100',
    },
    {
      icon: <GraduationCap className="text-indigo-600" size={32} />,
      title: 'Placement Drives',
      description: 'Get notified about upcoming placement drives and recruitment opportunities.',
      link: '/drives',
      color: 'from-indigo-50 to-indigo-100',
      iconBg: 'bg-indigo-100',
    },
    {
      icon: <BookOpen className="text-orange-600" size={32} />,
      title: 'Course Resources',
      description: 'Access curated learning materials and course links from faculty.',
      link: '/courses',
      color: 'from-orange-50 to-orange-100',
      iconBg: 'bg-orange-100',
    },
    {
      icon: <Lightbulb className="text-yellow-600" size={32} />,
      title: 'AI Recommendations',
      description: 'Get personalized project recommendations based on your skills and interests.',
      link: '/recommendations',
      color: 'from-yellow-50 to-yellow-100',
      iconBg: 'bg-yellow-100',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMy4zMTQgMi42ODYtNiA2LTZzNiAyLjY4NiA2IDYtMi42ODYgNi02IDYtNi0yLjY4Ni02LTZ6TTAgMTZjMC0zLjMxNCAyLjY4Ni02IDYtNnM2IDIuNjg2IDYgNi0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
          
          {/* Floating Orbs */}
          <div className="absolute inset-0">
            <motion.div 
              animate={{ 
                y: [0, -30, 0],
                x: [0, 20, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className="absolute top-20 left-[10%] w-64 h-64 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur-3xl opacity-30"
            ></motion.div>
            
            <motion.div 
              animate={{ 
                y: [0, 40, 0],
                x: [0, -30, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 10, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute bottom-20 right-[10%] w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-3xl opacity-30"
            ></motion.div>
            
            <motion.div 
              animate={{ 
                y: [0, -20, 0],
                x: [0, 15, 0],
                scale: [1, 1.15, 1]
              }}
              transition={{ 
                duration: 7, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-3xl opacity-20"
            ></motion.div>
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div className="text-white">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-white/20 rounded-full px-5 py-2.5 text-sm font-medium mb-6 shadow-lg">
                  <Sparkles size={18} className="text-yellow-300 animate-pulse" />
                  <span className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent font-semibold">
                    Empowering Campus Innovation
                  </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                    Campus
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                    Collab
                  </span>
                </h1>

                <p className="text-xl md:text-2xl mb-6 text-blue-100 leading-relaxed max-w-xl">
                  Unite. Innovate. Succeed. Your all-in-one platform for collaborative learning, 
                  project building, and career growth.
                </p>

                {/* Total Users Count */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-8"
                >
                  <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3">
                    <FaUsers className="text-yellow-300" size={24} />
                    <div>
                      <div className="text-sm text-blue-200">Total Users</div>
                      <div className="text-2xl font-bold text-white">
                        {totalUsers > 0 ? `${totalUsers.toLocaleString()}+` : '---'}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {!isAuthenticated ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      to="/register"
                      className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      <span className="relative">Start Your Journey</span>
                      <ArrowRight size={20} className="relative group-hover:translate-x-2 transition-transform" />
                    </Link>
                    <Link
                      to="/login"
                      className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300 hover:border-white/50 flex items-center justify-center"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-md border border-yellow-400/30 rounded-2xl p-6 inline-block"
                  >
                    <p className="text-2xl mb-2">
                      Welcome back,
                    </p>
                    <p className="text-4xl font-black bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
                      {user?.name}! 👋
                    </p>
                    <p className="text-blue-200 mt-3 text-sm">Ready to make an impact today?</p>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Right Side - Stats Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="grid grid-cols-2 gap-6">
                {[
                  { 
                    icon: <Briefcase className="text-blue-400" size={32} />,
                    total: stats.totalProjects,
                    active: stats.activeProjects,
                    completed: stats.completedProjects,
                    label: 'Projects',
                    color: 'from-blue-500/20 to-cyan-500/20',
                    border: 'border-blue-400/30'
                  },
                  { 
                    icon: <Code className="text-purple-400" size={32} />,
                    total: stats.totalHackathons,
                    label: 'Hackathons',
                    color: 'from-purple-500/20 to-pink-500/20',
                    border: 'border-purple-400/30'
                  },
                  { 
                    icon: <GraduationCap className="text-green-400" size={32} />,
                    total: stats.totalInternships,
                    label: 'Internships',
                    color: 'from-green-500/20 to-emerald-500/20',
                    border: 'border-green-400/30'
                  },
                  { 
                    icon: <BookOpen className="text-orange-400" size={32} />,
                    total: stats.totalResources,
                    label: 'Resources',
                    color: 'from-orange-500/20 to-yellow-500/20',
                    border: 'border-orange-400/30'
                  }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className={`bg-gradient-to-br ${stat.color} backdrop-blur-md border ${stat.border} rounded-2xl p-6 text-white hover:shadow-2xl transition-all duration-300`}
                  >
                    <div className="mb-3">{stat.icon}</div>
                    {loadingProjects ? (
                      <div className="text-3xl font-black mb-1 animate-pulse">---</div>
                    ) : (
                      <div>
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                          className="text-3xl font-black mb-1"
                        >
                          {stat.total > 0 ? `${stat.total}` : '0'}
                        </motion.div>
                        {stat.active !== undefined && stat.completed !== undefined && (
                          <div className="flex items-center space-x-2 text-xs text-blue-100/80 mt-1">
                            <span className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
                              {stat.active} Active
                            </span>
                            <span>•</span>
                            <span className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></span>
                              {stat.completed} Done
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-sm text-blue-100 font-medium mt-2">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Floating Badge */}
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, 0, -5, 0]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mt-8 bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-md border border-pink-400/30 rounded-2xl p-4 text-center"
              >
                <div className="flex items-center justify-center space-x-2 text-white">
                  <TrendingUp className="text-pink-400" size={24} />
                  {loadingProjects ? (
                    <span className="font-bold text-lg animate-pulse">Loading...</span>
                  ) : (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.5 }}
                      className="font-bold text-lg"
                    >
                      {(() => {
                        const total = stats.totalProjects + stats.totalHackathons + stats.totalInternships + stats.totalDrives + stats.totalResources;
                        return total > 0 ? `${total}+ Total Items` : 'Growing Community';
                      })()}
                    </motion.span>
                  )}
                </div>
                <div className="text-blue-200 text-xs mt-2 flex items-center justify-center space-x-3">
                  <span className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
                    {stats.activeProjects} Active Projects
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></span>
                    {stats.completedProjects} Completed
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex flex-col items-center text-white/60 hover:text-white/90 transition-colors cursor-pointer"
            >
              <span className="text-sm mb-2">Explore More</span>
              <ArrowRight size={20} className="rotate-90" />
            </motion.div>
          </motion.div>
        )}
      </section>

      {/* Features Section */}
      {/* <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> succeed</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover powerful features designed to enhance your academic journey and professional growth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link to={feature.link}>
                  <div className={`group bg-gradient-to-br ${feature.color} rounded-2xl p-8 hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50`}>
                    <div className={`inline-flex p-3 rounded-xl ${feature.iconBg} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    <div className="mt-4 flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                      <span>Explore</span>
                      <ArrowRight size={16} className="ml-2" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Trending Projects Section */}
      {isAuthenticated && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-red-100 rounded-full px-4 py-2 mb-4">
                <TrendingUp size={20} className="text-orange-600" />
                <span className="text-sm font-semibold text-orange-600">Top Picks Today</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Trending Projects</h2>
              <p className="text-xl text-gray-600">Most popular projects getting attention from the community</p>
            </motion.div>

            {loadingProjects ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : trendingProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-stretch">
                {trendingProjects.map((project, index) => (
                  <motion.div
                    key={project._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Link to={`/projects?open=${project._id}`}>
                      <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-transparent hover:border-blue-200 cursor-pointer h-full flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition">
                              {project.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {project.description}
                            </p>
                          </div>
                          <div className="ml-2">
                            <div className="flex items-center space-x-1 bg-gradient-to-r from-orange-100 to-red-100 text-orange-600 px-3 py-1 rounded-full">
                              <TrendingUp size={14} />
                              <span className="text-xs font-bold">#{index + 1}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.domains?.slice(0, 2).map((domain) => (
                            <span
                              key={domain}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getDomainColor(domain)}`}
                            >
                              {domain}
                            </span>
                          ))}
                          {project.domains?.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              +{project.domains.length - 2} more
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100 mt-auto">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Heart size={16} className="text-red-500" />
                              <span className="font-medium">{project.likes?.length || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FaComment className="text-blue-500" />
                              <span className="font-medium">{project.comments?.length || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FaUsers className="text-green-500" />
                              <span className="font-medium">{project.participants?.length || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl">
                <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No trending projects yet. Be the first to create one!</p>
              </div>
            )}

            <div className="text-center">
              <Link
                to="/projects"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span>View All Projects</span>
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Drives Section */}
      {isAuthenticated && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full px-4 py-2 mb-4">
                <Calendar size={20} className="text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-600">UPCOMING OPPORTUNITIES</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Upcoming Placement Drives</h2>
              <p className="text-xl text-gray-600">Don't miss out on these upcoming opportunities</p>
            </motion.div>

            {loadingProjects ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : upcomingDrives.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {upcomingDrives.map((drive, index) => (
                    <motion.div
                      key={drive._id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Link to={`/drives/${drive._id}`}>
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-transparent hover:border-indigo-200 cursor-pointer h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-indigo-600 transition">
                                {drive.title}
                              </h3>
                              <p className="text-sm font-semibold text-indigo-600 mb-2">{drive.company}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar size={16} className="mr-2 text-indigo-500" />
                              <span>{formatDate(drive.driveDate)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <GraduationCap size={16} className="mr-2 text-purple-500" />
                              <span>{drive.jobRole}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Briefcase size={16} className="mr-2 text-green-500" />
                              <span>{drive.package}</span>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-indigo-100">
                            <div className="text-xs text-indigo-600 font-semibold">View Details →</div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <div className="text-center">
                  <Link
                    to="/drives"
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span>View All Drives</span>
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No upcoming drives at the moment. Check back soon!</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Statistics Section */}
      {isAuthenticated && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Platform Statistics</h2>
              <p className="text-xl text-gray-600">See what's been posted recently</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="max-w-6xl mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                {/* Period Toggle */}
                <div className="flex justify-center mb-8">
                  <div className="inline-flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setStatsPeriod('week')}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                        statsPeriod === 'week'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => setStatsPeriod('month')}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                        statsPeriod === 'month'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      This Month
                    </button>
                  </div>
                </div>

                {/* Category Filter Buttons */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  {[
                    { key: 'Projects', color: '#3b82f6', icon: <Briefcase size={16} /> },
                    { key: 'Internships', color: '#10b981', icon: <GraduationCap size={16} /> },
                    { key: 'Hackathons', color: '#a855f7', icon: <Code size={16} /> },
                    { key: 'Drives', color: '#6366f1', icon: <Target size={16} /> },
                    { key: 'Courses', color: '#f97316', icon: <BookOpen size={16} /> },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => toggleCategory(cat.key)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                        activeCategories[cat.key]
                          ? 'bg-white shadow-md border-2'
                          : 'bg-gray-100 border-2 border-transparent opacity-50'
                      }`}
                      style={{
                        borderColor: activeCategories[cat.key] ? cat.color : 'transparent',
                        color: activeCategories[cat.key] ? cat.color : '#6b7280'
                      }}
                    >
                      <div style={{ color: cat.color }}>{cat.icon}</div>
                        <span>{cat.key}</span>
                      {activeCategories[cat.key] && (
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                          {cat.key === 'Projects' ? postedStats.projects :
                           cat.key === 'Internships' ? postedStats.internships :
                           cat.key === 'Hackathons' ? postedStats.hackathons :
                           cat.key === 'Drives' ? postedStats.drives :
                           postedStats.courses}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Line Chart */}
                {chartData.length > 0 ? (
                  <div className="w-full" style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="label" 
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="line"
                        />
                        {activeCategories.Projects && (
                          <Line 
                            type="monotone" 
                            dataKey="Projects" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                        {activeCategories.Internships && (
                          <Line 
                            type="monotone" 
                            dataKey="Internships" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            dot={{ r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                        {activeCategories.Hackathons && (
                          <Line 
                            type="monotone" 
                            dataKey="Hackathons" 
                            stroke="#a855f7" 
                            strokeWidth={3}
                            dot={{ r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                        {activeCategories.Drives && (
                          <Line 
                            type="monotone" 
                            dataKey="Drives" 
                            stroke="#6366f1" 
                            strokeWidth={3}
                            dot={{ r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                        {activeCategories.Courses && (
                          <Line 
                            type="monotone" 
                            dataKey="Courses" 
                            stroke="#f97316" 
                            strokeWidth={3}
                            dot={{ r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No data available for the selected period</p>
                  </div>
                )}

                <div className="mt-6 text-center text-sm text-gray-500">
                  Showing posts created {statsPeriod === 'week' ? 'day-wise in the last 7 days' : 'week-wise in the last 4 weeks'}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Quick Actions for Students */}
      {isAuthenticated && user?.role === 'student' && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full px-4 py-2 mb-4">
                <Zap size={20} className="text-purple-600" />
                <span className="text-sm font-semibold text-purple-600">STUDENT ESSENTIALS</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <p className="text-xl text-gray-600">Everything you need, one click away</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Bell className="text-blue-600" size={28} />,
                  title: 'My Reminders',
                  description: 'View saved opportunities',
                  link: '/reminders',
                  color: 'from-blue-50 to-blue-100',
                  badge: null,
                },
                {
                  icon: <Target className="text-green-600" size={28} />,
                  title: 'AI Recommendations',
                  description: 'Get personalized suggestions',
                  link: '/recommendations',
                  color: 'from-green-50 to-green-100',
                  badge: 'Smart',
                },
                {
                  icon: <MessageCircle className="text-purple-600" size={28} />,
                  title: 'Messages',
                  description: 'Connect with peers',
                  link: '/chats',
                  color: 'from-purple-50 to-purple-100',
                  badge: null,
                },
                {
                  icon: <Award className="text-orange-600" size={28} />,
                  title: 'My Profile',
                  description: 'Showcase your skills',
                  link: '/profile',
                  color: 'from-orange-50 to-orange-100',
                  badge: null,
                },
              ].map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link to={action.link}>
                    <div className={`relative bg-gradient-to-br ${action.color} rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50 h-full`}>
                      {action.badge && (
                        <div className="absolute top-4 right-4">
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                            {action.badge}
                          </span>
                        </div>
                      )}
                      <div className="mb-4">{action.icon}</div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 container mx-auto px-4 text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Start Collaborating?</h2>
              <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
                Join thousands of students and faculty already using Campus Collab to achieve their goals.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/register"
                  className="group px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
                >
                  <span>Create Your Account</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20"
                >
                  Sign In
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Have questions?</h3>
            <p className="text-gray-600 mb-6">We're here to help you get started</p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <MessageCircle size={20} />
                <span>Contact Support</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar size={20} />
                <span>Schedule Demo</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;