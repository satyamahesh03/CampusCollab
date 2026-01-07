import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { reminderAPI, chatAPI, notificationAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import socketService from '../utils/socket';

const GlobalContext = createContext();

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};

export const GlobalProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [newReminderIds, setNewReminderIds] = useState([]); // Track newly added reminder IDs
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingChatRequests, setPendingChatRequests] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const notificationHandlerRef = useRef(null);

  // Load reminders and unread messages when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchReminders();
      fetchUnreadMessages();
      fetchPendingChatRequests();
      fetchUnreadNotificationCount();
      
      // Connect to socket for global message notifications
      socketService.connect(user.id);
      
      // Set up global message listener
      socketService.onNewMessage((data) => {
        // Play sound for any new message
        playNotificationSound();
        // Refresh unread count
        fetchUnreadMessages();
        // Show notification
        addNotification({ 
          type: 'info', 
          message: `New message from ${data.message.sender?.name || 'Unknown'}` 
        });
      });
      
      // Set up socket listener for new notifications
      // Use ref to persist handler across renders
      notificationHandlerRef.current = () => {
        // Refresh notification count for any new notification
        fetchUnreadNotificationCount();
      };
      
      // Set up listener when socket is ready
      const setupNotificationListener = () => {
        if (socketService.socket && notificationHandlerRef.current) {
          // Remove old listener if exists
          socketService.socket.off('new-notification', notificationHandlerRef.current);
          // Add new listener
          socketService.socket.on('new-notification', notificationHandlerRef.current);
        }
      };
      
      // Handler for socket connect event
      const onConnect = () => {
        setupNotificationListener();
      };
      
      // Try to set up immediately if socket is connected
      if (socketService.socket && socketService.socket.connected) {
        setupNotificationListener();
      } else if (socketService.socket) {
        // Also set up when socket connects (in case it's not connected yet)
        socketService.socket.on('connect', onConnect);
      }
      
      // Refresh unread count every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadMessages();
        fetchPendingChatRequests();
        fetchUnreadNotificationCount();
      }, 30000);

      return () => {
        clearInterval(interval);
        socketService.off('new-message');
        if (socketService.socket && notificationHandlerRef.current) {
          socketService.socket.off('new-notification', notificationHandlerRef.current);
          socketService.socket.off('connect', onConnect);
        }
      };
    } else {
      setReminders([]);
      setNewReminderIds([]);
      setUnreadMessages(0);
      setPendingChatRequests(0);
      setUnreadNotificationCount(0);
    }
  }, [isAuthenticated, user]);

  const fetchReminders = async () => {
    try {
      const response = await reminderAPI.getAll();
      const oldReminderIds = reminders.map(r => r._id);
      const newReminders = response.data;
      
      // Identify newly added reminders
      const newIds = newReminders
        .filter(r => !oldReminderIds.includes(r._id))
        .map(r => r._id);
      
      if (newIds.length > 0) {
        setNewReminderIds(newIds);
        // Remove shake effect after 3 seconds
        setTimeout(() => {
          setNewReminderIds([]);
        }, 3000);
      }
      
      setReminders(newReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { ...notification, id }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const addReminder = (reminder) => {
    setReminders((prev) => {
      // Check if reminder already exists
      const exists = prev.some(
        (r) => r.itemId === reminder.itemId && r.itemType === reminder.itemType
      );
      if (exists) return prev;
      return [...prev, reminder];
    });
  };

  const removeReminder = (reminderId) => {
    setReminders((prev) => prev.filter((r) => r._id !== reminderId));
  };

  const fetchUnreadMessages = async () => {
    try {
      const response = await chatAPI.getAll();
      const chats = response.data || [];
      
      // Calculate total unread messages
      let totalUnread = 0;
      chats.forEach(chat => {
        if (chat.unreadCount) {
          const unreadMap = chat.unreadCount instanceof Map 
            ? chat.unreadCount 
            : new Map(Object.entries(chat.unreadCount));
          totalUnread += unreadMap.get(user.id) || 0;
        }
      });
      
      setUnreadMessages(totalUnread);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  const fetchPendingChatRequests = async () => {
    try {
      const response = await chatAPI.getRequests();
      const requests = response?.data || response || [];
      
      // Count pending requests where current user is NOT the initiator
      // (i.e., requests waiting for user's approval)
      const pendingCount = requests.filter(request => {
        const isInitiator = request.initiatedBy === user.id || request.initiatedBy?._id === user.id;
        return request.status === 'pending' && !isInitiator;
      }).length;
      
      setPendingChatRequests(pendingCount);
    } catch (error) {
      console.error('Error fetching pending chat requests:', error);
    }
  };

  const refreshReminders = () => {
    if (isAuthenticated && user) {
      fetchReminders();
    }
  };

  const refreshUnreadMessages = () => {
    if (isAuthenticated && user) {
      fetchUnreadMessages();
    }
  };

  const refreshPendingChatRequests = () => {
    if (isAuthenticated && user) {
      fetchPendingChatRequests();
    }
  };

  const fetchUnreadNotificationCount = async () => {
    try {
      const response = await notificationAPI.getAll();
      const unreadCount = response.data.unreadCount || 0;
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  };

  const refreshUnreadNotificationCount = () => {
    if (isAuthenticated && user) {
      fetchUnreadNotificationCount();
    }
  };

  // Play notification sound globally
  const playNotificationSound = () => {
    if (soundEnabled) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    reminders,
    addReminder,
    removeReminder,
    setReminders,
    refreshReminders,
    newReminderIds,
    unreadMessages,
    setUnreadMessages,
    refreshUnreadMessages,
    pendingChatRequests,
    refreshPendingChatRequests,
    unreadNotificationCount,
    refreshUnreadNotificationCount,
    soundEnabled,
    setSoundEnabled,
    playNotificationSound,
  };

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export default GlobalContext;

