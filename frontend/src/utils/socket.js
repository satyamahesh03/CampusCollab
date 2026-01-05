import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||  'https://campuscollab-odlh.onrender.com';
// 'http://localhost:6500';

class SocketService {
  constructor() {
    this.socket = null;
    this.onlineUsers = new Set();
  }

  connect(userId) {
    if (!this.socket) {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        auth: {
          token: token
        },
        extraHeaders: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        if (userId) {
          this.setUserOnline(userId);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Listen for user status changes
      this.socket.on('user-status-change', (data) => {
        if (data.online) {
          this.onlineUsers.add(data.userId);
        } else {
          this.onlineUsers.delete(data.userId);
        }
        
        // Update entire online users list if provided
        if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
          this.onlineUsers = new Set(data.onlineUsers);
        }
      });

      // Get initial online users list
      this.socket.on('online-users-list', (data) => {
        if (data.users && Array.isArray(data.users)) {
          this.onlineUsers = new Set(data.users);
        }
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.onlineUsers.clear();
    }
  }

  setUserOnline(userId) {
    if (this.socket) {
      this.socket.emit('user-online', userId);
      // Request current online users list
      this.socket.emit('get-online-users');
    }
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  joinChat(chatId) {
    if (this.socket) {
      this.socket.emit('join-chat', chatId);
    }
  }

  leaveChat(chatId) {
    if (this.socket) {
      this.socket.emit('leave-chat', chatId);
    }
  }

  sendMessage(data) {
    if (this.socket) {
      this.socket.emit('send-message', data);
    }
  }

  deleteMessage(data) {
    if (this.socket) {
      this.socket.emit('delete-message', data);
    }
  }

  approveChat(data) {
    if (this.socket) {
      this.socket.emit('chat-approved', data);
    }
  }

  rejectChat(data) {
    if (this.socket) {
      this.socket.emit('chat-rejected', data);
    }
  }

  getOnlineUsers() {
    if (this.socket) {
      this.socket.emit('get-online-users');
    }
  }

  markAsRead(data) {
    if (this.socket) {
      this.socket.emit('mark-read', data);
    }
  }

  sendTypingIndicator(data) {
    if (this.socket) {
      this.socket.emit('typing', data);
    }
  }

  // Event listeners
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  onMessageError(callback) {
    if (this.socket) {
      this.socket.on('message-error', callback);
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  onMessageStatusUpdate(callback) {
    if (this.socket) {
      this.socket.on('message-status-update', callback);
    }
  }

  onMessagesRead(callback) {
    if (this.socket) {
      this.socket.on('messages-read', callback);
    }
  }

  onMessageDeleted(callback) {
    if (this.socket) {
      this.socket.on('message-deleted', callback);
    }
  }

  onUserStatusChange(callback) {
    if (this.socket) {
      this.socket.on('user-status-change', callback);
    }
  }

  onChatStatusChanged(callback) {
    if (this.socket) {
      this.socket.on('chat-status-changed', callback);
    }
  }

  onOnlineUsersList(callback) {
    if (this.socket) {
      this.socket.on('online-users-list', callback);
    }
  }

  // Project team chat methods
  joinProjectChat(projectId) {
    if (this.socket) {
      this.socket.emit('join-project-chat', projectId);
    }
  }

  leaveProjectChat(projectId) {
    if (this.socket) {
      this.socket.emit('leave-project-chat', projectId);
    }
  }

  sendProjectChatMessage(projectId, content, userId) {
    if (this.socket) {
      this.socket.emit('send-project-chat-message', { projectId, content, userId });
    }
  }

  onNewProjectChatMessage(callback) {
    if (this.socket) {
      this.socket.on('new-project-chat-message', callback);
    }
  }

  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

const socketService = new SocketService();
export default socketService;
