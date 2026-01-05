import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { projectAPI, hackathonAPI, internshipAPI, driveAPI, courseLinkAPI, statsAPI } from '../utils/api';
import { motion } from 'framer-motion';
import cclogo from '../assets/cclogo.png';
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
import Loading from '../components/Loading';

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [trendingProjects, setTrendingProjects] = useState([]);
  const [upcomingDrives, setUpcomingDrives] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [statsPeriod, setStatsPeriod] = useState('week'); // 'week' or 'month' - default to week
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
      // Fetch trending projects for everyone
      try {
        const projectsResponse = await projectAPI.getAll({ sort: 'trending', status: 'open' });
        setTrendingProjects(projectsResponse.data.slice(0, 3));
      } catch (error) {
        // If not authenticated, projects might fail, but continue with other data
        console.log('Could not fetch projects:', error);
      }
      
      // Fetch upcoming drives (only 3) - available for everyone
      const drivesResponse = await driveAPI.getAll({});
      const upcoming = (drivesResponse.data || [])
        .filter(drive => new Date(drive.driveDate) >= new Date())
        .sort((a, b) => new Date(a.driveDate) - new Date(b.driveDate))
        .slice(0, 3);
      setUpcomingDrives(upcoming);
      
      // Fetch comprehensive stats data (available for everyone)
      try {
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
        // If stats fail, continue with other data
        console.log('Could not fetch stats:', error);
      }
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

  const handleNavigate = (e, path) => {
    e.preventDefault();
    if (!isAuthenticated) {
      // Redirect to login with return path
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
    } else {
      navigate(path);
    }
  };

  const features = [
    {
      icon: <Briefcase className="text-amber-600" size={32} />,
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
      color: 'from-amber-50 to-yellow-100',
      iconBg: 'bg-purple-100',
    },
    {
      icon: <GraduationCap className="text-indigo-600" size={32} />,
      title: 'Placement Drives',
      description: 'Get notified about upcoming placement drives and recruitment opportunities.',
      link: '/drives',
      color: 'from-yellow-50 to-amber-100',
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(245,158,11,0.1)_1px,transparent_0)] bg-[size:40px_40px]"></div>
        </div>
        
        {/* Simple Color Patches */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-32 right-[15%] w-64 h-64 bg-amber-200/20 rounded-3xl blur-2xl rotate-12"></div>
          <div className="absolute bottom-40 left-[10%] w-72 h-72 bg-yellow-200/25 rounded-3xl blur-2xl -rotate-12"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-100/15 rounded-3xl blur-3xl"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mb-6 flex justify-center"
              >
                <img 
                  src={cclogo} 
                  alt="Campus Collab Logo" 
                  className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto object-contain select-none"
                  draggable="false"
                />
              </motion.div>
              
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
                <span className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 bg-clip-text text-transparent">
                  Campus Collab
                </span>
              </h1>

              {/* Minimal Tagline */}
              <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-10 font-medium max-w-2xl mx-auto">
                Connect. Collaborate. Grow.
              </p>

              {/* Key Stats - Minimal */}
              {!loadingProjects && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-10"
                >
                  <motion.div 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                    >
                      <FaUsers className="text-amber-600" size={20} />
                    </motion.div>
                    <div className="text-left">
                      <motion.div 
                        className="text-2xl sm:text-3xl font-bold text-gray-900"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      >
                        {totalUsers > 0 ? `${totalUsers.toLocaleString()}+` : '---'}
                      </motion.div>
                      <div className="text-xs text-gray-600">Users</div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="w-px h-12 bg-gray-300"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  
                  <motion.div 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    >
                      <Briefcase className="text-yellow-600" size={20} />
                    </motion.div>
                    <div className="text-left">
                      <motion.div 
                        className="text-2xl sm:text-3xl font-bold text-gray-900"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                      >
                        {(stats.activeProjects + stats.completedProjects) > 0 ? `${(stats.activeProjects + stats.completedProjects).toLocaleString()}+` : '0'}
                      </motion.div>
                      <div className="text-xs text-gray-600">Projects</div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* CTA Buttons */}
              {!isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="flex flex-col sm:flex-row gap-6 sm:gap-4 justify-center items-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ 
                      boxShadow: [
                        "0 10px 25px rgba(245, 158, 11, 0.3)",
                        "0 15px 35px rgba(245, 158, 11, 0.4)",
                        "0 10px 25px rgba(245, 158, 11, 0.3)",
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Link
                      to="/register"
                      className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-semibold text-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <span>Get Started</span>
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/login"
                      className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold text-lg hover:border-amber-300 hover:bg-amber-50 transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      Sign In
                    </Link>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Animated Floating Elements - Only for non-authenticated users */}
        {!isAuthenticated && (
          <>
            {/* Floating Icons */}
            {[Briefcase, Code, GraduationCap, BookOpen, Lightbulb].map((Icon, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1],
                  x: [0, Math.sin(index) * 20, 0],
                  y: [0, Math.cos(index) * 20, 0],
                }}
                transition={{
                  duration: 4 + index,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.5,
                }}
                className="absolute"
                style={{
                  top: `${15 + index * 12}%`,
                  ...(index % 2 === 0 
                    ? { left: `${10 + index * 10}%` }
                    : { right: `${10 + (index - 1) * 10}%` }
                  ),
                }}
              >
                <Icon 
                  size={32} 
                  className="text-amber-300/40" 
                />
              </motion.div>
            ))}

            {/* Animated Circles */}
            {[...Array(6)].map((_, index) => (
              <motion.div
                key={`circle-${index}`}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                  scale: [1, 1.2, 1],
                  x: [0, Math.random() * 50 - 25, 0],
                  y: [0, Math.random() * 50 - 25, 0],
                }}
                transition={{
                  duration: 5 + index * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.3,
                }}
                className="absolute rounded-full bg-amber-200/20 blur-xl"
                style={{
                  width: `${40 + index * 15}px`,
                  height: `${40 + index * 15}px`,
                  top: `${20 + index * 12}%`,
                  left: `${5 + index * 15}%`,
                }}
              />
            ))}

            {/* Pulse Animation on Stats */}
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-100/10 rounded-full blur-3xl"
            />

            {/* Minimal Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <span className="text-xs mb-1 font-medium">Scroll</span>
                <ArrowRight size={16} className="rotate-90" />
              </motion.div>
            </motion.div>
          </>
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
              <span className="bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent"> succeed</span>
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
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    <div className="mt-4 flex items-center text-amber-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
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
      <section className="py-20">
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
            <Loading text="Loading trending projects..." />
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
                  <div 
                    onClick={(e) => handleNavigate(e, `/projects?open=${project._id}`)}
                    className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 transition-all duration-300 border border-amber-100/50 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full flex flex-col"
                  >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-amber-600 transition">
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
              <div
                onClick={(e) => handleNavigate(e, '/projects')}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
              >
                <span>View All Projects</span>
                <ArrowRight size={20} />
              </div>
            </div>
        </div>
      </section>

      {/* Upcoming Drives Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full px-4 py-2 mb-4">
              <Calendar size={20} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-600">UPCOMING OPPORTUNITIES</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Placement Drives</h2>
            <p className="text-xl text-gray-600">Don't miss out on these upcoming opportunities</p>
          </motion.div>

          {loadingProjects ? (
            <Loading text="Loading upcoming drives..." />
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
                    <div 
                      onClick={(e) => handleNavigate(e, `/drives/${drive._id}`)}
                      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 transition-all duration-300 border border-amber-100/50 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full"
                    >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-amber-600 transition">
                                {drive.title}
                              </h3>
                              <p className="text-sm font-semibold text-amber-600 mb-2">{drive.company}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar size={16} className="mr-2 text-amber-500" />
                              <span>{formatDate(drive.driveDate)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <GraduationCap size={16} className="mr-2 text-yellow-500" />
                              <span>{drive.jobRole}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Briefcase size={16} className="mr-2 text-amber-500" />
                              <span>{drive.package}</span>
                            </div>
                          </div>

                      <div className="pt-4 border-t border-amber-100">
                        <div className="text-xs text-amber-600 font-semibold">View Details →</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="text-center">
                <div
                  onClick={(e) => handleNavigate(e, '/drives')}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                >
                  <span>View All Drives</span>
                  <ArrowRight size={20} />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No upcoming drives at the moment. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20">
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
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-100/50 p-4 sm:p-6 md:p-8">
                {/* Period Toggle */}
                <div className="flex justify-center mb-6 sm:mb-8">
                  <div className="inline-flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setStatsPeriod('week')}
                      className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 ${
                        statsPeriod === 'week'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => setStatsPeriod('month')}
                      className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 ${
                        statsPeriod === 'month'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      This Month
                    </button>
                  </div>
                </div>

                {/* Category Filter Buttons */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                  {[
                    { key: 'Projects', color: '#3b82f6', icon: <Briefcase size={14} /> }, // Bright Blue
                    { key: 'Internships', color: '#10b981', icon: <GraduationCap size={14} /> }, // Emerald Green
                    { key: 'Hackathons', color: '#8b5cf6', icon: <Code size={14} /> }, // Violet Purple
                    { key: 'Drives', color: '#ef4444', icon: <Target size={14} /> }, // Red
                    { key: 'Courses', color: '#ec4899', icon: <BookOpen size={14} /> }, // Pink/Magenta
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => toggleCategory(cat.key)}
                      className={`flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 ${
                        activeCategories[cat.key]
                          ? 'bg-white/60 backdrop-blur-sm border-2 border-amber-200/50'
                          : 'bg-gray-100/50 border-2 border-transparent opacity-50'
                      }`}
                      style={{
                        borderColor: activeCategories[cat.key] ? cat.color : 'transparent',
                        color: activeCategories[cat.key] ? cat.color : '#6b7280',
                        backgroundColor: activeCategories[cat.key] ? `${cat.color}15` : 'transparent'
                      }}
                    >
                      <div style={{ color: cat.color }} className="sm:hidden">{cat.icon}</div>
                      <div style={{ color: cat.color }} className="hidden sm:block">{cat.icon}</div>
                        <span className="hidden sm:inline">{cat.key}</span>
                        <span className="sm:hidden">{cat.key.substring(0, 3)}</span>
                      {activeCategories[cat.key] && (
                        <span 
                          className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-semibold"
                          style={{ 
                            backgroundColor: `${cat.color}20`,
                            color: cat.color
                          }}
                        >
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
                  <div className="w-full overflow-x-auto">
                    <div className="w-full min-w-[300px] min-h-[300px]" style={{ height: '300px', position: 'relative' }}>
                      <ResponsiveContainer width="100%" height={300} minHeight={300}>
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: statsPeriod === 'month' ? 60 : 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="label" 
                            stroke="#6b7280"
                            style={{ fontSize: statsPeriod === 'month' ? '11px' : '10px' }}
                            angle={statsPeriod === 'month' ? -45 : -45}
                            textAnchor="end"
                            height={statsPeriod === 'month' ? 100 : 60}
                            interval={0}
                            tick={{ fill: '#6b7280' }}
                            tickFormatter={(value) => value || ''}
                          />
                          <YAxis 
                            stroke="#6b7280"
                            style={{ fontSize: '10px' }}
                            width={40}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.6)', 
                              backdropFilter: 'blur(4px)',
                              border: '1px solid rgba(245, 158, 11, 0.2)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              fontSize: '12px',
                              padding: '8px'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                            iconType="line"
                            iconSize={12}
                          />
                        {activeCategories.Projects && (
                          <Line 
                            type="monotone" 
                            dataKey="Projects" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#3b82f6' }}
                            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#2563eb', strokeWidth: 2 }}
                          />
                        )}
                        {activeCategories.Internships && (
                          <Line 
                            type="monotone" 
                            dataKey="Internships" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#10b981' }}
                            activeDot={{ r: 6, fill: '#10b981', stroke: '#059669', strokeWidth: 2 }}
                          />
                        )}
                        {activeCategories.Hackathons && (
                          <Line 
                            type="monotone" 
                            dataKey="Hackathons" 
                            stroke="#8b5cf6" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#8b5cf6' }}
                            activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#7c3aed', strokeWidth: 2 }}
                          />
                        )}
                        {activeCategories.Drives && (
                          <Line 
                            type="monotone" 
                            dataKey="Drives" 
                            stroke="#ef4444" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#ef4444' }}
                            activeDot={{ r: 6, fill: '#ef4444', stroke: '#dc2626', strokeWidth: 2 }}
                          />
                        )}
                        {activeCategories.Courses && (
                          <Line 
                            type="monotone" 
                            dataKey="Courses" 
                            stroke="#ec4899" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#ec4899' }}
                            activeDot={{ r: 6, fill: '#ec4899', stroke: '#db2777', strokeWidth: 2 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
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

      {/* Quick Actions for Students */}
      {isAuthenticated && user?.role === 'student' && (
        <section className="py-20">
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
                  icon: <Bell className="text-amber-600" size={28} />,
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
                  color: 'from-amber-50 to-yellow-100',
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


      {/* Footer CTA */}
      {/* <section className="py-16 bg-white border-t border-gray-200">
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
      </section> */}
    </div>
  );
};

export default Home;
