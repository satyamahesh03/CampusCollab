require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const http = require('http');
const socketio = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const Chat = require('./models/Chat');
const User = require('./models/User');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/internships', require('./routes/internships'));
app.use('/api/hackathons', require('./routes/hackathons'));
app.use('/api/drives', require('./routes/drives'));
app.use('/api/course-links', require('./routes/courseLinks'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/stats', require('./routes/stats'));

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Campus Collab API is running',
    version: '1.0.0'
  });
});

// Socket.io for real-time chat
const onlineUsers = new Map(); // userId -> { socketId, lastSeen }

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User comes online
  socket.on('user-online', (userId) => {
    onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });
    socket.userId = userId;
    
    // Broadcast to all clients
    io.emit('user-status-change', { 
      userId, 
      online: true,
      onlineUsers: Array.from(onlineUsers.keys())
    });
    
    console.log(`User ${userId} is online. Total online: ${onlineUsers.size}`);
  });

  // Join a chat room
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`User joined chat: ${chatId}`);
  });

  // Leave a chat room
  socket.on('leave-chat', (chatId) => {
    socket.leave(chatId);
    console.log(`User left chat: ${chatId}`);
  });

  // Handle sending messages
  socket.on('send-message', async (data) => {
    try {
      const { chatId, userId, content } = data;

      // Check if user is blocked
      const chat = await Chat.findById(chatId).populate('participants');
      if (chat) {
        const otherParticipant = chat.participants.find(p => !p._id.equals(userId));
        const currentUser = await User.findById(userId);
        const otherUser = await User.findById(otherParticipant._id);

        // Check if either user has blocked the other
        const isBlockedByMe = currentUser.blockedUsers && currentUser.blockedUsers.some(id => id.equals(otherParticipant._id));
        const isBlockedByThem = otherUser.blockedUsers && otherUser.blockedUsers.some(id => id.equals(userId));

        if (isBlockedByMe) {
          socket.emit('message-error', {
            message: 'You have blocked this user. Unblock them to send messages.'
          });
          return;
        }

        if (isBlockedByThem) {
          socket.emit('message-error', {
            message: 'You cannot send messages to this user.'
          });
          return;
        }
        // Check if chat is pending and enforce 2-message limit
        if (chat.status === 'pending') {
          const isInitiator = chat.initiatedBy && chat.initiatedBy.equals(userId);
          
          if (isInitiator) {
            // Count messages sent by initiator
            const initiatorMessages = chat.messages.filter(msg => msg.sender && msg.sender.equals(userId));
            
            if (initiatorMessages.length >= 2) {
              socket.emit('message-error', {
                message: 'You can only send 2 messages before the other person approves'
              });
              return;
            }
          } else {
            // Recipient cannot send messages until they approve
            socket.emit('message-error', {
              message: 'Please approve the chat request first to send messages'
            });
            return;
          }
        }

        const newMessage = {
          sender: userId,
          content: content,
          status: 'sent'
        };
        
        chat.messages.push(newMessage);
        
        // Update unread count for the other participant (already declared above)
        if (!chat.unreadCount) chat.unreadCount = new Map();
        const currentUnread = chat.unreadCount.get(otherParticipant._id.toString()) || 0;
        chat.unreadCount.set(otherParticipant._id.toString(), currentUnread + 1);
        
        chat.lastMessage = Date.now();
        await chat.save();

        const savedMessage = chat.messages[chat.messages.length - 1];

        // Emit message to all users in the chat
        io.to(chatId).emit('new-message', {
          chatId,
          message: savedMessage,
          unreadCount: chat.unreadCount
        });

        // If other user is online, mark as delivered
        if (onlineUsers.has(otherParticipant._id.toString())) {
          savedMessage.status = 'delivered';
          await chat.save();
          io.to(chatId).emit('message-status-update', {
            messageId: savedMessage._id,
            status: 'delivered'
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message-error', {
        message: 'Error sending message'
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('user-typing', {
      userId: data.userId,
      isTyping: data.isTyping
    });
  });

  // Mark messages as read
  socket.on('mark-read', async (data) => {
    try {
      const { chatId, userId } = data;
      const chat = await Chat.findById(chatId);
      
      if (chat) {
        let updated = false;
        chat.messages.forEach(msg => {
          if (!msg.sender.equals(userId) && msg.status !== 'read') {
            msg.status = 'read';
            msg.readAt = new Date();
            updated = true;
          }
        });

        // Reset unread count for current user
        if (!chat.unreadCount) chat.unreadCount = new Map();
        chat.unreadCount.set(userId, 0);

        if (updated) {
          await chat.save();
          io.to(chatId).emit('messages-read', { userId, chatId });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Handle message deletion
  socket.on('delete-message', async (data) => {
    try {
      const { chatId, messageId, userId } = data;
      const chat = await Chat.findById(chatId);
      
      if (chat) {
        const message = chat.messages.id(messageId);
        if (message && message.sender.equals(userId)) {
          message.isDeleted = true;
          message.content = 'This message was deleted';
          await chat.save();
          
          io.to(chatId).emit('message-deleted', { chatId, messageId });
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  // Get online users list
  socket.on('get-online-users', () => {
    socket.emit('online-users-list', {
      users: Array.from(onlineUsers.keys())
    });
  });

  // Chat approval
  socket.on('chat-approved', (data) => {
    io.to(data.chatId).emit('chat-status-changed', {
      chatId: data.chatId,
      status: 'accepted'
    });
  });

  // Chat rejection
  socket.on('chat-rejected', (data) => {
    io.to(data.chatId).emit('chat-status-changed', {
      chatId: data.chatId,
      status: 'rejected'
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      const userData = onlineUsers.get(socket.userId);
      if (userData) {
        userData.lastSeen = new Date();
      }
      onlineUsers.delete(socket.userId);
      
      // Broadcast to all clients
      io.emit('user-status-change', { 
        userId: socket.userId, 
        online: false,
        lastSeen: new Date(),
        onlineUsers: Array.from(onlineUsers.keys())
      });
      
      console.log(`User ${socket.userId} went offline. Total online: ${onlineUsers.size}`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 6500;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

