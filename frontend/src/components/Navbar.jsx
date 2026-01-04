import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cclogo from '../assets/cclogo.png';
import { 
  Menu,
  X,
  Bell,
  MessageCircle,
  User,
  LogOut,
  Settings,
  Home,
  Briefcase,
  Code,
  GraduationCap,
  BookOpen,
  Lightbulb,
  Shield,
  KanbanSquare,
  Building2
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { reminders, unreadMessages, newReminderIds, unreadNotificationCount } = useGlobal();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const hasNewReminders = newReminderIds.length > 0;
  const profileMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowProfileMenu(false);
  };

  const isActive = (path) => location.pathname === path;

  // Truncate name at word boundary if longer than 15 characters
  const truncateName = (name, maxLength = 15) => {
    if (!name || name.length <= maxLength) return name;
    
    // Find the last space before maxLength
    const truncated = name.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    // If space found, truncate at that space; otherwise truncate at maxLength
    if (lastSpaceIndex > 0) {
      return name.substring(0, lastSpaceIndex);
    }
    return truncated;
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const navigationItems = [
    { name: 'Projects', path: '/projects', icon: KanbanSquare },
    { name: 'Internships', path: '/internships', icon: Briefcase },
    { name: 'Hackathons', path: '/hackathons', icon: Code },
    { name: 'Drives', path: '/drives', icon: Building2 },
    { name: 'Courses', path: '/courses', icon: BookOpen },
  ];

  if (user?.role === 'student') {
    navigationItems.push({ name: 'Recommendations', path: '/recommendations', icon: Lightbulb });
  }

  if (user?.role === 'admin') {
    navigationItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  return (
    <nav className="bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={cclogo} 
              alt="Campus Collab Logo" 
              className="h-8 sm:h-10 w-auto object-contain select-none"
              draggable="false"
            />
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <motion.div
                  className="relative"
                  animate={hasNewReminders ? {
                    rotate: [0, -10, 10, -10, 10, 0],
                    transition: {
                      duration: 0.5,
                      repeat: 1,
                      ease: "easeInOut"
                    }
                  } : {}}
                >
                  <Link
                    to="/notifications"
                    className="relative p-2 text-gray-600 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50 inline-flex items-center justify-center"
                  >
                    <Bell size={20} className={hasNewReminders || unreadNotificationCount > 0 ? 'text-amber-600' : ''} />
                    {(reminders.length > 0 || unreadNotificationCount > 0) && (
                      <span className={`absolute top-0 right-0 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-medium ${
                        hasNewReminders || unreadNotificationCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`}>
                        {reminders.length + unreadNotificationCount}
                      </span>
                    )}
                  </Link>
                </motion.div>

                {/* Messages */}
                <Link
                  to="/chats"
                  className="relative p-2 text-gray-600 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50"
                >
                  <MessageCircle size={20} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center text-xs font-medium">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Profile Menu */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 p-2 text-gray-700 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                      {user?.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user?.name || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user?.name?.charAt(0)?.toUpperCase()
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-medium">{truncateName(user?.name)}</span>
                  </button>

                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-amber-50/90 backdrop-blur-sm rounded-xl border border-amber-100/50 py-2 z-50"
                      >
                        <div className="px-4 py-3 border-b border-amber-100/50 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0">
                            {user?.profilePicture ? (
                              <img 
                                src={user.profilePicture} 
                                alt={user?.name || 'User'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user?.name?.charAt(0)?.toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{truncateName(user?.name)}</p>
                          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                          </div>
                        </div>
                        <div className="py-1">
                          <Link
                            to="/profile"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-amber-50/50 transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            <User size={16} />
                            <span>Profile</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={16} />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-amber-600 hover:text-amber-700 font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {isAuthenticated && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 active:scale-95"
                aria-label="Toggle menu"
              >
                <motion.div
                  animate={showMobileMenu ? { rotate: 180 } : { rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {showMobileMenu ? (
                    <X size={24} className="text-amber-600" />
                  ) : (
                    <Menu size={24} />
                  )}
                </motion.div>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation - Overlay */}
        <AnimatePresence>
          {showMobileMenu && isAuthenticated && (
            <>
              {/* Backdrop - closes menu when clicked */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setShowMobileMenu(false)}
              />
              {/* Mobile Menu */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-2xl border-b border-gray-200 z-[60] max-h-screen overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-amber-100/50 bg-transparent">
                  <div className="flex items-center space-x-2">
                    <img 
                      src={cclogo} 
                      alt="Campus Collab Logo" 
                      className="h-8 w-auto object-contain select-none"
                      draggable="false"
                    />
                    <h2 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                      Menu
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>
                {/* Navigation Items */}
                <div className="px-4 py-4 space-y-2">
                  {navigationItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          to={item.path}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                            isActive(item.path)
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30 transform scale-105'
                              : 'text-gray-700 hover:text-amber-600 hover:bg-amber-50/80 hover:shadow-md'
                          }`}
                          onClick={() => setShowMobileMenu(false)}
                        >
                          <Icon size={20} className={isActive(item.path) ? 'text-white' : 'text-gray-600'} />
                          <span className="font-semibold">{item.name}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;