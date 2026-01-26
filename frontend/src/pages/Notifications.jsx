import { useState, useEffect } from 'react';
import { notificationAPI, reminderAPI } from '../utils/api';
import { useGlobal } from '../context/GlobalContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import { formatDate, formatRelativeTime } from '../utils/helpers';
import { FaTrash, FaBell, FaClock, FaCheck, FaCheckDouble, FaTimes, FaExclamationCircle, FaCheckCircle, FaBan } from 'react-icons/fa';
import { motion } from 'framer-motion';
import socketService from '../utils/socket';

const Notifications = () => {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' or 'reminders'
  const { addNotification, refreshUnreadNotificationCount } = useGlobal();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    // Connect socket if not already connected
    if (isAuthenticated && user) {
      socketService.connect(user.id);
    }

    // Set up socket listener for new notifications
    const handleNewNotification = (data) => {
      if (data.type === 'project_join_request') {
        // Refresh notifications when a new join request notification arrives
        fetchNotifications();
      }
    };

    socketService.socket?.on('new-notification', handleNewNotification);

    return () => {
      socketService.socket?.off('new-notification', handleNewNotification);
    };
  }, [isAuthenticated, user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getAll();
      // Limit to last 10 notifications, sorted by most recent first
      const allNotifications = response.data.notifications || [];
      const sortedNotifications = allNotifications
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
      setNotifications(sortedNotifications);
      setReminders(response.data.reminders || []);
      const unreadCount = response.data.unreadCount || 0;
      setUnreadCount(unreadCount);
      // Refresh count in GlobalContext for navbar
      if (refreshUnreadNotificationCount) {
        refreshUnreadNotificationCount();
      }
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to fetch notifications' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(notifications.map(n =>
        n._id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
      // Refresh count in GlobalContext for navbar
      refreshUnreadNotificationCount();
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to mark notification as read' });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      // Refresh count in GlobalContext for navbar
      refreshUnreadNotificationCount();
      addNotification({ type: 'success', message: 'All notifications marked as read' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to mark all as read' });
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notificationAPI.delete(id);
      setNotifications(notifications.filter(n => n._id !== id));
      if (!notifications.find(n => n._id === id)?.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
      addNotification({ type: 'success', message: 'Notification deleted' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to delete notification' });
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      await reminderAPI.delete(id);
      setReminders(reminders.filter((r) => r._id !== id));
      addNotification({ type: 'success', message: 'Reminder deleted' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to delete reminder' });
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Navigate to the project and scroll to the specific reply
    if ((notification.type === 'comment_reply' || notification.type === 'content_approved') && notification.projectId) {
      navigate(`/projects/${notification.projectId}`, {
        state: {
          scrollToComment: notification.commentId,
          scrollToReply: notification.replyId
        }
      });
    }

    // Navigate to project and open join requests section
    if (notification.type === 'project_join_request' && notification.projectId) {
      navigate(`/projects/${notification.projectId}`, {
        state: {
          showJoinRequests: true
        }
      });
    }
  };

  const handleReminderClick = (reminder) => {
    if (!reminder.item || !reminder.item._id) return;

    // Navigate to the appropriate page based on item type
    if (reminder.itemType === 'internship') {
      navigate(`/internships/${reminder.item._id}`);
    } else if (reminder.itemType === 'hackathon') {
      navigate(`/hackathons/${reminder.item._id}`);
    } else if (reminder.itemType === 'drive') {
      navigate(`/drives/${reminder.item._id}`);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {activeTab === 'notifications' && unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm"
          >
            <div className="relative flex items-center" style={{ width: '16px', height: '12px' }}>
              <FaCheck className="absolute text-xs text-green-500" style={{ left: '0px', opacity: 0.6 }} />
              <FaCheck className="absolute text-xs text-green-500" style={{ left: '4px' }} />
            </div>
            <span className="text-xs sm:text-sm">Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${activeTab === 'notifications'
            ? 'border-amber-600 text-amber-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <div className="flex items-center space-x-2">
            <FaBell />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${activeTab === 'reminders'
            ? 'border-amber-600 text-amber-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <div className="flex items-center space-x-2">
            <FaClock />
            <span>Reminders</span>
            {reminders.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                {reminders.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Notifications Section */}
      {activeTab === 'notifications' && (
        <div>
          {notifications.length === 0 ? (
            <div className="text-center py-12 bg-amber-50/60 backdrop-blur-sm rounded-lg border border-amber-100/50">
              <FaBell className="mx-auto text-4xl text-amber-400 mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">

              {notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white/60 backdrop-blur-sm rounded-lg border p-3 sm:p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-all duration-300 ${notification.type === 'account_suspended' || notification.title === 'Content Warning'
                      ? 'border-red-400 bg-red-50/50 hover:border-red-500' // Warning/Suspended styling
                      : notification.type === 'account_unsuspended' || notification.title === 'Content Approved'
                        ? 'border-green-400 bg-green-50/50 hover:border-green-500' // Approved/Reactivated styling
                        : !notification.isRead
                          ? 'border-l-4 border-l-amber-500 border-amber-100/50 hover:border-amber-400'
                          : 'border-amber-100/50 hover:border-amber-400'
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${notification.type === 'account_suspended' || notification.title === 'Content Warning'
                          ? 'bg-red-100 text-red-700'
                          : notification.type === 'account_unsuspended' || notification.title === 'Content Approved'
                            ? 'bg-green-100 text-green-700'
                            : notification.type === 'comment_reply'
                              ? 'bg-green-100 text-green-700'
                              : notification.type === 'project_join_request'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                        {notification.type === 'account_suspended' ? 'Suspended' : notification.type === 'account_unsuspended' ? 'Reactivated' : notification.title === 'Content Warning' ? 'Warning' : notification.title === 'Content Approved' ? 'Approved' : (notification.type === 'comment_reply' ? 'Reply' : notification.type === 'project_join_request' ? 'Join Request' : notification.type)}
                      </span>
                      {!notification.isRead && (
                        <span className={`w-2 h-2 rounded-full ${notification.type === 'account_suspended' || notification.title === 'Content Warning' ? 'bg-red-500' : notification.type === 'account_unsuspended' || notification.title === 'Content Approved' ? 'bg-green-500' : 'bg-amber-500'
                          }`}></span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(notification.type === 'account_suspended' || notification.title === 'Content Warning') && <span className="text-red-600">{notification.type === 'account_suspended' ? <FaBan /> : <FaExclamationCircle />}</span>}
                      {(notification.type === 'account_unsuspended' || notification.title === 'Content Approved') && <span className="text-green-600"><FaCheckCircle /></span>}
                      <h3 className={`font-semibold mb-1 text-sm ${notification.type === 'account_suspended' || notification.title === 'Content Warning' ? 'text-red-700' : notification.type === 'account_unsuspended' || notification.title === 'Content Approved' ? 'text-green-800' : 'text-gray-900'
                        }`}>{notification.title}</h3>
                    </div>
                    <p className="text-gray-700 text-xs mb-2">{notification.message}</p>
                    <p className="text-[10px] text-gray-500">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification._id);
                        }}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Mark as read"
                      >
                        <FaCheck />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification._id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reminders Section */}
      {activeTab === 'reminders' && (
        <div>
          {reminders.length === 0 ? (
            <div className="text-center py-12 bg-amber-50/60 backdrop-blur-sm rounded-lg border border-amber-100/50">
              <FaClock className="mx-auto text-4xl text-amber-400 mb-4" />
              <p className="text-gray-500">No reminders yet. Save internships, hackathons, or drives to get reminders here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <motion.div
                  key={reminder._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 p-6 flex justify-between items-start cursor-pointer hover:border-amber-400 hover:shadow-lg transition-all duration-300"
                  onClick={() => handleReminderClick(reminder)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                        {reminder.itemType}
                      </span>
                      <h3 className="text-xl font-semibold">{reminder.item?.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-2">{reminder.item?.description?.substring(0, 150)}...</p>
                    {reminder.itemType === 'internship' && (
                      <p className="text-sm text-gray-500">
                        Deadline: {formatDate(reminder.item?.applicationDeadline)}
                      </p>
                    )}
                    {reminder.itemType === 'hackathon' && (
                      <p className="text-sm text-gray-500">
                        Start Date: {formatDate(reminder.item?.startDate)}
                      </p>
                    )}
                    {reminder.itemType === 'drive' && (
                      <p className="text-sm text-gray-500">
                        Drive Date: {formatDate(reminder.item?.driveDate)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteReminder(reminder._id);
                    }}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <FaTrash />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;

