import { useState, useEffect, useRef } from 'react';
import { chatAPI, authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import socketService from '../utils/socket';
import { formatRelativeTime } from '../utils/helpers';
import Loading from '../components/Loading';
import { FaPaperPlane, FaSearch, FaTimes, FaTrash, FaCheck, FaCheckDouble, FaEllipsisV, FaArrowLeft, FaUserClock, FaBan, FaUserSlash, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { MessageCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

const Chats = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
  const [newChatUser, setNewChatUser] = useState(null); // User to start new chat with
  const [blockedUsers, setBlockedUsers] = useState([]);
  const { user } = useAuth();
  const { addNotification, refreshUnreadMessages, soundEnabled, setSoundEnabled, playNotificationSound } = useGlobal();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioRef = useRef(null);
  const { chatId } = useParams();
  const navigate = useNavigate();


  useEffect(() => {
    fetchChats();
    fetchBlockedUsers();
    socketService.connect(user?.id);
  }, []);

  // Handle chatId from URL
  useEffect(() => {
    if (chatId && chats.length > 0 && (!selectedChat || selectedChat._id !== chatId)) {
      const chat = chats.find(c => c._id === chatId);
      if (chat) {
        setSelectedChat(chat);
        socketService.joinChat(chat._id);
        // Mark messages as read
        chatAPI.markAsRead(chat._id).then(() => {
          socketService.markAsRead({ chatId: chat._id, userId: user.id });
          fetchChats();
          refreshUnreadMessages();
        }).catch(err => console.error('Error marking as read:', err));
      }
    }
  }, [chatId, chats]);

  useEffect(() => {
    if (!user?.id) return;

    // Set up socket event listeners
    socketService.onNewMessage((data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setSelectedChat((prev) => ({
          ...prev,
          messages: [...prev.messages, data.message],
        }));
        // Mark as read if chat is open
        socketService.markAsRead({ chatId: data.chatId, userId: user.id });
      }
      // Refresh chat list to update last message and unread count
      fetchChats();
    });

    socketService.onMessageError((data) => {
      addNotification({ type: 'error', message: data.message });
    });

    socketService.onUserTyping((data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.isTyping
      }));
    });

    socketService.onMessageStatusUpdate((data) => {
      if (selectedChat) {
        setSelectedChat(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg._id === data.messageId ? { ...msg, status: data.status } : msg
          )
        }));
      }
    });

    socketService.onMessagesRead((data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setSelectedChat(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.sender === user.id ? { ...msg, status: 'read' } : msg
          )
        }));
      }
    });

    socketService.onMessageDeleted((data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setSelectedChat(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg._id === data.messageId ? { ...msg, isDeleted: true, content: 'This message was deleted' } : msg
          )
        }));
      }
      fetchChats();
    });

    socketService.onUserStatusChange((data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.online) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        
        // Update entire list if provided
        if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
          return new Set(data.onlineUsers);
        }
        
        return newSet;
      });
    });

    socketService.onOnlineUsersList((data) => {
      if (data.users && Array.isArray(data.users)) {
        setOnlineUsers(new Set(data.users));
      }
    });

    socketService.onChatStatusChanged((data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setSelectedChat(prev => ({
          ...prev,
          status: data.status
        }));
      }
      fetchChats();
    });

    // Request online users list periodically
    socketService.getOnlineUsers();
    const onlineInterval = setInterval(() => {
      socketService.getOnlineUsers();
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(onlineInterval);
      socketService.off('new-message');
      socketService.off('message-error');
      socketService.off('user-typing');
      socketService.off('message-status-update');
      socketService.off('messages-read');
      socketService.off('message-deleted');
      socketService.off('user-status-change');
      socketService.off('chat-status-changed');
      socketService.off('online-users-list');
    };
  }, [selectedChat, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  // Keep input field visible by scrolling to bottom
  useEffect(() => {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [selectedChat?.messages]);

  // ESC key to go back to chat list
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        if (selectedChat || newChatUser) {
          handleBackToList();
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [selectedChat, newChatUser]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getAll();
      setChats(response.data);
      refreshUnreadMessages(); // Update global unread count
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to fetch chats' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const response = await authAPI.getBlockedUsers();
      setBlockedUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const handleSearchUsers = async (query) => {
    try {
      setSearchQuery(query);
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      const response = await chatAPI.searchUsers(query);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleStartChat = async (selectedUser) => {
    // Check if chat already exists
    const existingChat = chats.find(chat => 
      chat.participants.some(p => p._id === selectedUser._id)
    );

    if (existingChat) {
      // Chat exists, open it normally
      setSelectedChat(existingChat);
      socketService.joinChat(existingChat._id);
      navigate(`/chats/${existingChat._id}`);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      // No existing chat, set up new chat mode (request will be created on first message)
      setNewChatUser(selectedUser);
      setSelectedChat(null);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const createChatAndSendFirstMessage = async (userId, messageContent) => {
    try {
      // Create the chat (which creates pending request)
      const response = await chatAPI.getChat(userId);
      const newChat = response.data;
      
      setSelectedChat(newChat);
      socketService.joinChat(newChat._id);
      navigate(`/chats/${newChat._id}`);
      
      // Now send the first message
      socketService.sendMessage({
        chatId: newChat._id,
        userId: user.id,
        content: messageContent,
      });
      
      fetchChats(); // Refresh to show in sidebar
      setNewChatUser(null);
      
      addNotification({ 
        type: 'success', 
        message: 'Chat request sent! You can send 1 more message before they approve.' 
      });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to send message' });
    }
  };

  const handleSelectChat = async (chat) => {
    // Avoid re-selecting if already selected
    if (selectedChat?._id === chat._id) return;
    
    // Clear new chat user if any
    setNewChatUser(null);
    
    setSelectedChat(chat);
    socketService.joinChat(chat._id);
    
    // Only navigate if not already on this chat's URL
    if (chatId !== chat._id) {
      navigate(`/chats/${chat._id}`);
    }
    
    // Mark messages as read
    try {
      await chatAPI.markAsRead(chat._id);
      socketService.markAsRead({ chatId: chat._id, userId: user.id });
      fetchChats(); // Refresh to update unread count
      refreshUnreadMessages(); // Update global unread count
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setNewChatUser(null);
    navigate('/chats');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // If this is a new chat (no existing chat selected), create it with first message
    if (newChatUser) {
      await createChatAndSendFirstMessage(newChatUser._id, message.trim());
      setMessage('');
      return;
    }

    if (!selectedChat) return;

    // Check if pending chat and user is initiator
    if (selectedChat.status === 'pending') {
      const isInitiator = selectedChat.initiatedBy === user.id || selectedChat.initiatedBy?._id === user.id;
      if (isInitiator) {
        const initiatorMessages = selectedChat.messages.filter(msg => 
          msg.sender === user.id || msg.sender?._id === user.id
        );
        if (initiatorMessages.length >= 2) {
          addNotification({ 
            type: 'warning', 
            message: 'You can only send 2 messages before approval. Wait for them to accept.' 
          });
          return;
        }
      }
    }

    try {
      socketService.sendMessage({
        chatId: selectedChat._id,
        userId: user.id,
        content: message.trim(),
      });
      setMessage('');
      // Stop typing indicator
      socketService.sendTypingIndicator({
        chatId: selectedChat._id,
        userId: user.id,
        isTyping: false
      });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to send message' });
    }
  };

  const handleTyping = (value) => {
    setMessage(value);
    
    if (selectedChat) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing indicator
      socketService.sendTypingIndicator({
        chatId: selectedChat._id,
        userId: user.id,
        isTyping: value.length > 0
      });

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTypingIndicator({
          chatId: selectedChat._id,
          userId: user.id,
          isTyping: false
        });
      }, 2000);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      await chatAPI.deleteMessage(selectedChat._id, messageId);
      socketService.deleteMessage({
        chatId: selectedChat._id,
        messageId,
        userId: user.id
      });
      setShowDeleteMenu(null);
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to delete message' });
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('Delete this conversation? (Other person will still see it)')) return;

    try {
      await chatAPI.deleteChat(selectedChat._id);
      setSelectedChat(null);
      navigate('/chats');
      fetchChats();
      addNotification({ type: 'success', message: 'Chat deleted for you' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to delete chat' });
    }
  };

  const handleApproveChat = async () => {
    try {
      await chatAPI.approveChat(selectedChat._id);
      socketService.approveChat({ chatId: selectedChat._id });
      setSelectedChat(prev => ({ ...prev, status: 'accepted' }));
      fetchChats();
      addNotification({ type: 'success', message: 'Chat request accepted!' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to approve chat' });
    }
  };

  const handleRejectChat = async () => {
    if (!window.confirm('Reject this chat request?')) return;

    try {
      await chatAPI.rejectChat(selectedChat._id);
      socketService.rejectChat({ chatId: selectedChat._id });
      setSelectedChat(null);
      navigate('/chats');
      fetchChats();
      addNotification({ type: 'success', message: 'Chat request rejected' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to reject chat' });
    }
  };

  const handleBlockUser = async () => {
    if (!selectedChat) return;
    
    const otherUser = getOtherUser(selectedChat);
    if (!window.confirm(`Block ${otherUser?.name}? They won't be able to message you.`)) return;

    try {
      await authAPI.blockUser(otherUser._id);
      await fetchBlockedUsers();
      addNotification({ type: 'success', message: `${otherUser?.name} has been blocked` });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to block user' });
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedChat) return;
    
    const otherUser = getOtherUser(selectedChat);

    try {
      await authAPI.unblockUser(otherUser._id);
      await fetchBlockedUsers();
      addNotification({ type: 'success', message: `${otherUser?.name} has been unblocked` });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to unblock user' });
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile?userId=${userId}`);
  };

  const getUnreadCount = (chat) => {
    if (!chat.unreadCount) return 0;
    const unreadMap = chat.unreadCount instanceof Map ? chat.unreadCount : new Map(Object.entries(chat.unreadCount));
    return unreadMap.get(user.id) || 0;
  };

  const getTotalUnreadCount = () => {
    return chats.reduce((total, chat) => total + getUnreadCount(chat), 0);
  };

  const getOtherUser = (chat) => {
    return chat.participants?.find((p) => p._id !== user.id);
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId) || socketService.isUserOnline(userId);
  };

  const isUserBlocked = (userId) => {
    return blockedUsers.some(blockedUser => blockedUser._id === userId || blockedUser === userId);
  };

  const getMessageStatusIcon = (msg) => {
    if (msg.sender !== user.id && msg.sender?._id !== user.id) return null;
    
    if (msg.status === 'read') {
      return (
        <span className="inline-flex items-center" title="Read">
          <FaCheckDouble className="text-blue-500 text-base" />
        </span>
      );
    } else if (msg.status === 'delivered') {
      return (
        <span className="inline-flex items-center" title="Delivered">
          <FaCheckDouble className="text-gray-400 text-base" />
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center" title="Sent">
          <FaCheck className="text-gray-400 text-base" />
        </span>
      );
    }
  };

  if (loading) return <Loading text="Loading chats..." />;

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* Modern Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="text-blue-600" size={28} />
                Messages
              </h1>
              {getTotalUnreadCount() > 0 && (
                <p className="text-sm text-blue-600 font-medium mt-0.5">
                  {getTotalUnreadCount()} unread conversation{getTotalUnreadCount() > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition ${
                  soundEnabled 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
              >
                {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
              </button>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <FaSearch />
                <span className="font-medium">New Chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowSearch(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Start New Conversation</h2>
                <button onClick={() => setShowSearch(false)} className="text-white hover:bg-white/20 p-2 rounded-full transition">
                  <FaTimes size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="relative mb-4">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Search by name, email, or department..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  autoFocus
                />
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                      <FaSearch size={40} className="mx-auto" />
                    </div>
                    <p className="text-gray-500">
                      {searchQuery.length >= 2 ? 'No users found' : 'Start typing to search...'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((searchUser) => (
                      <div
                        key={searchUser._id}
                        onClick={() => handleStartChat(searchUser)}
                        className="flex items-center space-x-3 p-4 hover:bg-blue-50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-blue-200"
                      >
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                            {searchUser.profilePicture ? (
                              <img src={searchUser.profilePicture} alt={searchUser.name} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              searchUser.name.charAt(0).toUpperCase()
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">{searchUser.name}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <span>{searchUser.department}</span>
                            <span>•</span>
                            <span className="capitalize">{searchUser.role}</span>
                          </div>
                        </div>
                        <MessageCircle className="text-blue-600" size={20} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Container */}
      <div className="flex-1 container mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex h-full border border-gray-200">
          {/* Sidebar - Chat List */}
          <div className="w-full md:w-96 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-5 border-b bg-white">
              <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                Recent Chats
              </h2>
            </div>
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {chats.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <MessageCircle className="text-blue-600" size={32} />
                </div>
                <p className="text-gray-900 font-medium mb-2">No conversations yet</p>
                <p className="text-sm text-gray-500">Click "New Chat" to start messaging</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {chats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  const unreadCount = getUnreadCount(chat);
                  const isOnline = isUserOnline(otherUser?._id);
                  const lastMsg = chat.messages[chat.messages.length - 1];
                  const isPending = chat.status === 'pending';
                  const isInitiator = chat.initiatedBy?._id === user.id || chat.initiatedBy === user.id;
                  
              return (
                <div
                  key={chat._id}
                      onClick={() => handleSelectChat(chat)}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        selectedChat?._id === chat._id 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                          : 'hover:bg-white hover:shadow-sm'
                      }`}
                    >
                    <div className="flex items-start space-x-3">
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full ${selectedChat?._id === chat._id ? 'ring-2 ring-white' : ''} flex items-center justify-center text-white font-bold shadow-md`}>
                          {otherUser?.profilePicture ? (
                            <img src={otherUser.profilePicture} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm">
                              {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <span className={`font-semibold truncate ${selectedChat?._id === chat._id ? 'text-white' : 'text-gray-900'}`}>
                              {otherUser?.name || 'Unknown User'}
                            </span>
                            {isOnline && (
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            )}
                            {isPending && !isInitiator && (
                              <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium flex-shrink-0">New</span>
                            )}
                            {isPending && isInitiator && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${selectedChat?._id === chat._id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>Pending</span>
                            )}
                          </div>
                          {lastMsg && (
                            <span className={`text-xs ml-2 flex-shrink-0 ${selectedChat?._id === chat._id ? 'text-white/80' : 'text-gray-500'}`}>
                              {formatRelativeTime(lastMsg.timestamp)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${selectedChat?._id === chat._id ? 'text-white/90' : 'text-gray-600'}`}>
                            {lastMsg?.content || (isPending && !isInitiator ? 'New chat request' : 'No messages yet')}
                          </p>
                          {unreadCount > 0 && (
                            <span className={`ml-2 text-xs font-bold rounded-full px-2.5 py-1 min-w-[24px] text-center flex-shrink-0 ${
                              selectedChat?._id === chat._id 
                                ? 'bg-white text-blue-600' 
                                : 'bg-blue-600 text-white'
                            }`}>
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
                </div>
          )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col" style={{ minHeight: 0, height: 'calc(100vh - 80px)' }}>
          {newChatUser ? (
            <>
              {/* New Chat Header */}
              <div className="p-5 border-b bg-gradient-to-r from-white to-gray-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleBackToList}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition"
                    title="Back to chats (ESC)"
                  >
                    <FaArrowLeft size={18} />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                      {newChatUser.profilePicture ? (
                        <img 
                          src={newChatUser.profilePicture} 
                          alt={newChatUser.name} 
                          className="w-10 h-10 rounded-full object-cover" 
                        />
                      ) : (
                        newChatUser.name?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    {isUserOnline(newChatUser._id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{newChatUser.name}</div>
                    <div className="text-xs text-gray-500">{newChatUser.department} • {newChatUser.role}</div>
                  </div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border-b border-blue-200 p-4">
                <div className="flex items-center space-x-3 text-blue-900">
                  <FaUserClock className="text-blue-600 text-lg" />
                  <div>
                    <p className="font-medium">Start a conversation</p>
                    <p className="text-sm text-blue-700">
                      Send your first message to {newChatUser.name}. They'll receive a chat request and can accept to continue chatting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Empty Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-lg mb-2">No messages yet</p>
                  <p className="text-sm">Type below to send your first message and create the chat request</p>
                </div>
              </div>

              {/* Message Input */}
              <div className="p-5 bg-white border-t shadow-lg sticky bottom-0 z-10" style={{ marginBottom: '0' }}>
                <form onSubmit={handleSendMessage} className="flex flex-col space-y-3">
                  <div className="text-xs text-blue-700 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
                    💬 Your first message will send a chat request. You can send 2 messages total before they approve.
                  </div>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your first message..."
                      className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <FaPaperPlane />
                      <span className="font-medium">Send</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-5 border-b bg-gradient-to-r from-white to-gray-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleBackToList}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition"
                    title="Back to chats (ESC)"
                  >
                    <FaArrowLeft size={18} />
                  </button>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white">
                    {getOtherUser(selectedChat)?.profilePicture ? (
                      <img 
                        src={getOtherUser(selectedChat).profilePicture} 
                        alt={getOtherUser(selectedChat).name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" 
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {getOtherUser(selectedChat)?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => handleViewProfile(getOtherUser(selectedChat)?._id)}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition text-left"
                    >
                      {getOtherUser(selectedChat)?.name}
                    </button>
                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                      {isUserOnline(getOtherUser(selectedChat)?._id) ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-600 font-medium">Online</span>
                        </>
                      ) : (
                        <span className="text-gray-500">Offline</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isUserBlocked(getOtherUser(selectedChat)?._id) ? (
                    <button
                      onClick={handleUnblockUser}
                      className="text-green-600 hover:text-green-800 p-2 flex items-center space-x-1"
                      title="Unblock user"
                    >
                      <FaUserSlash />
                      <span className="text-sm">Unblock</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleBlockUser}
                      className="text-orange-600 hover:text-orange-800 p-2"
                      title="Block user"
                    >
                      <FaBan />
                    </button>
                  )}
                  <button
                    onClick={handleDeleteChat}
                    className="text-red-600 hover:text-red-800 p-2"
                    title="Delete conversation"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Blocked Status Banner */}
              {isUserBlocked(getOtherUser(selectedChat)?._id) && (
                <div className="bg-red-50 border-b border-red-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaBan className="text-red-600 text-xl" />
                      <div>
                        <p className="font-semibold text-red-900">User Blocked</p>
                        <p className="text-sm text-red-700">You have blocked {getOtherUser(selectedChat)?.name}. They cannot message you.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleUnblockUser}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Unblock
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Request Banner */}
              {!isUserBlocked(getOtherUser(selectedChat)?._id) && selectedChat.status === 'pending' && selectedChat.initiatedBy !== user.id && selectedChat.initiatedBy?._id !== user.id && (
                <div className="bg-yellow-50 border-b border-yellow-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaUserClock className="text-yellow-600 text-xl" />
                      <div>
                        <p className="font-semibold text-gray-900">Chat Request</p>
                        <p className="text-sm text-gray-600">{getOtherUser(selectedChat)?.name} wants to chat with you</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleApproveChat}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
                      >
                        <FaCheck />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={handleRejectChat}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
                      >
                        <FaTimes />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending - For Initiator (Waiting for Approval) */}
              {!isUserBlocked(getOtherUser(selectedChat)?._id) && selectedChat.status === 'pending' && (selectedChat.initiatedBy === user.id || selectedChat.initiatedBy?._id === user.id) && (
                <div className="bg-blue-50 border-b border-blue-200 p-4">
                  <div className="flex items-center space-x-3 text-blue-900">
                    <FaUserClock className="text-blue-600 text-lg" />
                    <div>
                      <p className="font-medium">Waiting for approval...</p>
                      <p className="text-sm text-blue-700">
                        {getOtherUser(selectedChat)?.name} will see your messages when they accept. 
                        You can send up to 2 messages.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending - For Recipient (Approve Request) */}
              {!isUserBlocked(getOtherUser(selectedChat)?._id) && selectedChat.status === 'pending' && !(selectedChat.initiatedBy === user.id || selectedChat.initiatedBy?._id === user.id) && (
                <div className="bg-yellow-50 border-b border-yellow-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-yellow-900">
                      <FaUserClock className="text-yellow-600 text-lg" />
                      <div>
                        <p className="font-medium">Chat request from {getOtherUser(selectedChat)?.name}</p>
                        <p className="text-sm text-yellow-700">
                          Approve this chat to start messaging
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleApproveChat}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={handleRejectChat}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white space-y-4 chat-messages" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {selectedChat.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>
                      {selectedChat.status === 'pending' 
                        ? (selectedChat.initiatedBy === user.id || selectedChat.initiatedBy?._id === user.id 
                          ? 'Send your first message to start the conversation' 
                          : 'Waiting for approval to start messaging')
                        : 'No messages yet. Start the conversation!'
                      }
                    </p>
                  </div>
                ) : (
                  selectedChat.messages.map((msg, index) => {
                    const isOwn = msg.sender === user.id || msg.sender?._id === user.id;
                    const showAvatar = index === 0 || selectedChat.messages[index - 1].sender !== msg.sender;

                    return (
                      <div
                        key={msg._id || index}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}
                      >
                        {!isOwn && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                            {msg.sender?.profilePicture ? (
                              <img src={msg.sender.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                {getOtherUser(selectedChat)?.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        
                        <div className={`group relative max-w-xs lg:max-w-md ${isOwn ? 'order-1' : ''}`}>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              msg.isDeleted
                                ? 'bg-gray-100 text-gray-500 italic border border-gray-200'
                                : isOwn
                                ? 'bg-white text-gray-900 rounded-br-sm shadow-md border border-gray-200'
                                : 'bg-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
                            }`}
                          >
                            <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                            <div className="flex items-center justify-end space-x-2 mt-2">
                              <span className="text-xs font-medium text-gray-500">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isOwn && !msg.isDeleted && (
                                <span className="ml-1">
                                  {getMessageStatusIcon(msg)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isOwn && !msg.isDeleted && (
                            <button
                              onClick={() => setShowDeleteMenu(showDeleteMenu === msg._id ? null : msg._id)}
                              className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-gray-500 hover:text-gray-700"
                            >
                              <FaEllipsisV className="text-xs" />
                            </button>
                          )}
                          {showDeleteMenu === msg._id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={() => handleDeleteMessage(msg._id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                              >
                                <FaTrash className="text-xs" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator */}
              {typingUsers[getOtherUser(selectedChat)?._id] && (
                <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
                  <span className="italic">{getOtherUser(selectedChat)?.name} is typing...</span>
                </div>
              )}

              {/* Message Input */}
              <div className="p-5 bg-white border-t shadow-lg sticky bottom-0 z-10" style={{ marginBottom: '0' }}>
                {(() => {
                  const blocked = isUserBlocked(getOtherUser(selectedChat)?._id);
                  
                  // If user is blocked, show blocked message
                  if (blocked) {
                    return (
                      <div className="text-center text-red-600 py-3">
                        <p className="text-sm">
                          🚫 You have blocked this user. Unblock them to send messages.
                        </p>
                      </div>
                    );
                  }

                  const isPending = selectedChat.status === 'pending';
                  const isInitiator = selectedChat.initiatedBy === user.id || selectedChat.initiatedBy?._id === user.id;
                  const initiatorMessages = selectedChat.messages.filter(msg => 
                    msg.sender === (selectedChat.initiatedBy === user.id || selectedChat.initiatedBy?._id === user.id ? user.id : selectedChat.initiatedBy)
                  );
                  const messagesLeft = 2 - initiatorMessages.length;
                  
                  // Allow messaging if: chat is accepted OR (chat is pending AND user is initiator AND less than 2 messages sent)
                  const canSendMessage = selectedChat.status === 'accepted' || (isPending && isInitiator && messagesLeft > 0);

                  if (canSendMessage) {
                    return (
                      <form onSubmit={handleSendMessage} className="flex flex-col space-y-3">
                        {isPending && isInitiator && (
                          <div className="text-xs text-yellow-700 bg-yellow-50 px-4 py-2.5 rounded-xl border border-yellow-100">
                            ℹ️ You can send {messagesLeft} more message{messagesLeft !== 1 ? 's' : ''} before they approve
                          </div>
                        )}
                        <div className="flex space-x-3">
                  <input
                    type="text"
                    value={message}
                            onChange={(e) => handleTyping(e.target.value)}
                            placeholder={isPending ? `Send up to ${messagesLeft} message${messagesLeft !== 1 ? 's' : ''}...` : "Type a message..."}
                            className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <button
                    type="submit"
                            disabled={!message.trim()}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <FaPaperPlane />
                            <span className="font-medium">Send</span>
                  </button>
                </div>
              </form>
                    );
                  } else {
                    return (
                      <div className="text-center text-gray-500 py-3">
                        <p className="text-sm">
                          {isPending && isInitiator 
                            ? '⏳ You\'ve sent 2 messages. Waiting for them to accept...'
                            : '✋ Accept the chat request above to start messaging'}
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
              <div className="text-center px-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <MessageCircle className="text-blue-600" size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Your Messages</h3>
                <p className="text-gray-600 mb-4">Select a conversation to start chatting</p>
                <button
                  onClick={() => setShowSearch(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105 inline-flex items-center gap-2"
                >
                  <FaSearch />
                  <span className="font-medium">Start New Chat</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Chats;
