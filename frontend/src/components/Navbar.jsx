import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { reminders, unreadMessages, newReminderIds } = useGlobal();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const hasNewReminders = newReminderIds.length > 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowProfileMenu(false);
  };

  const isActive = (path) => location.pathname === path;

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
    <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Campus Collab
            </span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
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
          <div className="flex items-center space-x-2">
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
                    to="/reminders"
                    className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 inline-flex items-center justify-center"
                  >
                    <Bell size={20} className={hasNewReminders ? 'text-blue-600' : ''} />
                    {reminders.length > 0 && (
                      <span className={`absolute top-0 right-0 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-medium ${
                        hasNewReminders ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`}>
                        {reminders.length}
                      </span>
                    )}
                  </Link>
                </motion.div>

                {/* Messages */}
                <Link
                  to="/chats"
                  className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                >
                  <MessageCircle size={20} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center text-xs font-medium">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 p-2 text-gray-700 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium">{user?.name}</span>
                  </button>

                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                        <div className="py-1">
                          <Link
                            to="/profile"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {isAuthenticated && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {showMobileMenu && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden border-t border-gray-200 py-4"
            >
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;