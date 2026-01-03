import { useState, useEffect, useRef } from 'react';
import { chatAPI, authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import socketService from '../utils/socket';
import { formatRelativeTime, formatChatDate, isDifferentDay } from '../utils/helpers';
import Loading from '../components/Loading';
import { FaPaperPlane, FaSearch, FaTimes, FaTrash, FaCheck, FaCheckDouble, FaEllipsisV, FaArrowLeft, FaUserClock, FaBan, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { HiShieldCheck, HiTrash, HiUserAdd, HiUserRemove } from 'react-icons/hi';
import { MdBlock, MdPersonOff, MdDelete } from 'react-icons/md';
import { MessageCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

const Chats = () => {
  const [chats, setChats] = useState([]); // Approved chats only
  const [messageRequests, setMessageRequests] = useState([]); // Pending requests
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'requests'
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
  const messageInputRef = useRef(null);
  const { chatId } = useParams();
  const navigate = useNavigate();


  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchChats(),
          fetchMessageRequests(),
          fetchBlockedUsers()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
    socketService.connect(user?.id);
  }, []);

  // Clear selected chat when navigating back (browser back button)
  useEffect(() => {
    if (!chatId) {
      // Clear selected chat when chatId is removed from URL (browser back button)
      setSelectedChat(prevChat => {
        // Leave any active chat rooms before clearing
        if (prevChat) {
          socketService.leaveChat(prevChat._id);
        }
        return null;
      });
    }
  }, [chatId]);

  // Handle chatId from URL (can be chatCode or _id)
  useEffect(() => {
    if (chatId && (!selectedChat || (selectedChat._id !== chatId && selectedChat.chatCode !== chatId))) {
      // First try to find in existing chats
      let chat = chats.find(c => c.chatCode === chatId);
      if (!chat) {
        chat = chats.find(c => c._id === chatId);
      }
      
      if (chat) {
        setSelectedChat(chat);
        socketService.joinChat(chat._id);
        // Mark messages as read
        chatAPI.markAsRead(chat._id).then(() => {
          socketService.markAsRead({ chatId: chat._id, userId: user.id });
          fetchChats();
          refreshUnreadMessages();
        }).catch(err => console.error('Error marking as read:', err));
        
        // Auto-focus input
        setTimeout(() => {
          if (messageInputRef.current) {
            messageInputRef.current.focus();
          }
        }, 100);
      } else {
        // Try to fetch by chatCode from backend (this will restore deleted chats)
        chatAPI.getChatByCode(chatId).then(response => {
          const chat = response.data;
          setSelectedChat(chat);
          socketService.joinChat(chat._id);
          fetchChats(); // Refresh to show in sidebar
          
          // Auto-focus input
          setTimeout(() => {
            if (messageInputRef.current) {
              messageInputRef.current.focus();
            }
          }, 100);
        }).catch(err => {
          // If chatCode doesn't work, try as _id (for backward compatibility)
          if (chatId.length === 24) { // MongoDB ObjectId length
            chatAPI.getAll().then(response => {
              const allChats = response.data;
              const foundChat = allChats.find(c => c._id === chatId);
              if (foundChat) {
                setSelectedChat(foundChat);
                socketService.joinChat(foundChat._id);
                fetchChats();
              }
            }).catch(console.error);
          }
        });
      }
    }
  }, [chatId, chats]);

  useEffect(() => {
    if (!user?.id) return;

    // Set up socket event listeners
    socketService.onNewMessage((data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setSelectedChat((prev) => {
          // Ensure messages are sorted chronologically
          const updatedMessages = [...prev.messages, data.message].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
          return {
            ...prev,
            messages: updatedMessages,
            lastMessage: data.message.timestamp
          };
        });
        // Mark as read if chat is open
        socketService.markAsRead({ chatId: data.chatId, userId: user.id });
      }
      
      // Update only the specific chat in the list instead of full refresh
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat._id === data.chatId || chat._id?.toString() === data.chatId?.toString()) {
            // Ensure messages are sorted chronologically and update last message preview
            const updatedMessages = [...(chat.messages || []), data.message].sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );
            return {
              ...chat,
              messages: updatedMessages,
              lastMessage: data.message.timestamp,
              // Update last message content for preview
              lastMessageContent: data.message.content,
              unreadCount: data.unreadCount || chat.unreadCount
            };
          }
          return chat;
        });
        // Sort chats by last message time (most recent first)
        return updatedChats.sort((a, b) => {
          const timeA = a.lastMessage ? new Date(a.lastMessage).getTime() : 0;
          const timeB = b.lastMessage ? new Date(b.lastMessage).getTime() : 0;
          return timeB - timeA;
        });
      });
      
      // Only refresh requests if it's a request
      if (data.chatId && messageRequests.find(r => r._id === data.chatId)) {
        fetchMessageRequests();
      }
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
      if (selectedChat && (selectedChat._id === data.chatId || selectedChat._id?.toString() === data.chatId?.toString())) {
        setSelectedChat(prev => ({
          ...prev,
          messages: prev.messages.map(msg => {
            if (msg._id === data.messageId || msg._id?.toString() === data.messageId?.toString()) {
              return { ...msg, status: data.status };
            }
            return msg;
          })
        }));
      }
      // Also update in chat list if message is visible there
      setChats(prevChats => prevChats.map(chat => {
        if (chat._id === data.chatId || chat._id?.toString() === data.chatId?.toString()) {
          return {
            ...chat,
            messages: chat.messages.map(msg => {
              if (msg._id === data.messageId || msg._id?.toString() === data.messageId?.toString()) {
                return { ...msg, status: data.status };
              }
              return msg;
            })
          };
        }
        return chat;
      }));
    });

    socketService.onMessagesRead((data) => {
      if (selectedChat && (selectedChat._id === data.chatId || selectedChat._id?.toString() === data.chatId?.toString())) {
        setSelectedChat(prev => ({
          ...prev,
          messages: prev.messages.map(msg => {
            const isOwnMessage = msg.sender === user.id || msg.sender?._id === user.id || msg.sender?.toString() === user.id?.toString();
            if (isOwnMessage && msg.status !== 'read') {
              return { ...msg, status: 'read' };
            }
            return msg;
          })
        }));
      }
      // Also update in chat list
      setChats(prevChats => prevChats.map(chat => {
        if (chat._id === data.chatId || chat._id?.toString() === data.chatId?.toString()) {
          return {
            ...chat,
            messages: chat.messages.map(msg => {
              const isOwnMessage = msg.sender === user.id || msg.sender?._id === user.id || msg.sender?.toString() === user.id?.toString();
              if (isOwnMessage && msg.status !== 'read') {
                return { ...msg, status: 'read' };
              }
              return msg;
            })
          };
        }
        return chat;
      }));
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
        if (data.status === 'accepted') {
          setActiveTab('chats'); // Switch to chats tab after approval
        }
      }
      fetchChats();
      fetchMessageRequests(); // Refresh requests list
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

  // Auto-scroll to bottom when new messages arrive or chat changes
  useEffect(() => {
    if (selectedChat && messagesEndRef.current) {
      // Use setTimeout to ensure DOM is updated before scrolling
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [selectedChat?.messages, selectedChat?._id]);

  // Also scroll when chat container is available
  useEffect(() => {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer && selectedChat) {
      // Smooth scroll to bottom
      setTimeout(() => {
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [selectedChat?.messages?.length, selectedChat?._id]);

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
      const response = await chatAPI.getAll();
      console.log('Chats API response:', response);
      // API interceptor returns response.data, so response is already { success, data, count }
      const chatsData = response?.data || response || [];
      const chatsArray = Array.isArray(chatsData) ? chatsData : [];
      
      // Remove duplicates based on _id to prevent duplicate keys
      const uniqueChats = chatsArray.filter((chat, index, self) =>
        index === self.findIndex((c) => c._id === chat._id)
      );
      
      // Sort chats by last message time (most recent first)
      // Also ensure messages within each chat are sorted chronologically
      const sortedChats = uniqueChats.map(chat => ({
        ...chat,
        messages: (chat.messages || []).sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        )
      })).sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage).getTime() : (a.messages?.length > 0 ? new Date(a.messages[a.messages.length - 1]?.timestamp).getTime() : 0);
        const timeB = b.lastMessage ? new Date(b.lastMessage).getTime() : (b.messages?.length > 0 ? new Date(b.messages[b.messages.length - 1]?.timestamp).getTime() : 0);
        return timeB - timeA; // Most recent first
      });
      
      console.log('Setting chats:', sortedChats);
      setChats(sortedChats);
      refreshUnreadMessages(); // Update global unread count
    } catch (error) {
      console.error('Error fetching chats:', error);
      addNotification({ type: 'error', message: error?.message || 'Failed to fetch chats' });
      setChats([]); // Set empty array on error
    }
  };

  const fetchMessageRequests = async () => {
    try {
      const response = await chatAPI.getRequests();
      // API interceptor returns response.data, so response is already { success, data, count }
      const requestsData = response?.data || response || [];
      const requestsArray = Array.isArray(requestsData) ? requestsData : [];
      
      // Remove duplicates based on _id to prevent duplicate keys
      const uniqueRequests = requestsArray.filter((request, index, self) =>
        index === self.findIndex((r) => r._id === request._id)
      );
      
      setMessageRequests(uniqueRequests);
    } catch (error) {
      console.error('Failed to fetch message requests:', error);
      setMessageRequests([]); // Set empty array on error
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
      
      // Use chatCode if available, otherwise use _id
      const urlId = newChat.chatCode || newChat._id;
      navigate(`/chats/${urlId}`);
      
      // Now send the first message
      socketService.sendMessage({
        chatId: newChat._id,
        userId: user.id,
        content: messageContent,
      });
      
      fetchChats(); // Refresh to show in sidebar
      setNewChatUser(null);
      
      // Auto-focus input
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 100);
      
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
    
    // Ensure messages are sorted chronologically before setting selected chat
    const sortedChat = {
      ...chat,
      messages: (chat.messages || []).sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      )
    };
    
    setSelectedChat(sortedChat);
    socketService.joinChat(chat._id);
    
    // Navigate using chatCode if available, otherwise use chat ID
    const urlId = chat.chatCode || chat._id;
    if (chatId !== urlId) {
      navigate(`/chats/${urlId}`);
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
    
    // Auto-focus input and capitalize first character
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        // Capitalize first character if input is empty
        if (!message) {
          // Set a space and then remove it to trigger focus, then capitalize on first input
          messageInputRef.current.value = '';
        }
      }
    }, 100);
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
      // Before sending, ensure chat is restored if it was deleted
      // The backend will handle this, but we can also refresh the chat
      socketService.sendMessage({
        chatId: selectedChat._id,
        userId: user.id,
        content: message.trim(),
      });
      setMessage('');
      
      // Refresh chat list to ensure it appears if it was restored
      fetchChats();
      
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
    // Capitalize first character if it's the first character being typed
    if (value.length === 1 && value.length > message.length) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
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
    const otherUser = getOtherUser(selectedChat);
    const warningMessage = `⚠️ Delete Chat Request\n\nThis will request to delete the chat. ${otherUser?.name || 'The other person'} must also approve for the chat to be deleted.\n\nDo you want to send a delete request?`;
    
    if (!window.confirm(warningMessage)) return;

    try {
      const response = await chatAPI.deleteChat(selectedChat._id);
      // Update selected chat with delete request status
      setSelectedChat(prev => ({
        ...prev,
        deleteRequestedBy: user.id,
        deleteRequestStatus: 'pending'
      }));
      fetchChats(); // Refresh to show delete request status
      addNotification({ type: 'success', message: 'Delete request sent. Waiting for approval...' });
    } catch (error) {
      addNotification({ type: 'error', message: error?.response?.data?.message || 'Failed to send delete request' });
    }
  };

  const handleApproveDeleteRequest = async () => {
    if (!window.confirm('Are you sure you want to approve deleting this chat? This action cannot be undone.')) return;

    try {
      await chatAPI.approveDeleteRequest(selectedChat._id);
      setSelectedChat(null);
      navigate('/chats');
      fetchChats();
      fetchMessageRequests();
      addNotification({ type: 'success', message: 'Chat deleted - both users agreed' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to approve delete request' });
    }
  };

  const handleDeclineDeleteRequest = async () => {
    try {
      const response = await chatAPI.declineDeleteRequest(selectedChat._id);
      // Update selected chat to remove delete request status
      setSelectedChat(prev => ({
        ...prev,
        deleteRequestedBy: null,
        deleteRequestStatus: null
      }));
      fetchChats(); // Refresh to remove delete request status
      addNotification({ type: 'success', message: 'Delete request declined. Chat remains active.' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to decline delete request' });
    }
  };

  const handleApproveChat = async () => {
    try {
      const response = await chatAPI.approveChat(selectedChat._id);
      const approvedChat = response.data;
      socketService.approveChat({ chatId: selectedChat._id });
      
      // Update selected chat with new chatCode
      setSelectedChat(approvedChat);
      
      // Navigate to chatCode URL if available
      if (approvedChat.chatCode) {
        navigate(`/chats/${approvedChat.chatCode}`, { replace: true });
      }
      
      fetchChats(); // Refresh approved chats
      fetchMessageRequests(); // Remove from requests
      addNotification({ type: 'success', message: 'Chat request accepted!' });
      
      // Switch to chats tab after approval
      setActiveTab('chats');
      
      // Auto-focus input after approval
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 100);
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
      fetchMessageRequests(); // Remove from requests
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

  // WhatsApp-style tick component
  const WhatsAppTick = ({ status }) => {
    const size = 16;
    const color = status === 'read' ? '#f59e0b' : '#9ca3af'; // amber-500 for read, gray-400 for others
    
    if (status === 'read') {
      // Double blue ticks (read) merged together
      return (
        <span className="inline-flex items-center" style={{ gap: '0px', marginLeft: '-2px' }} title="Read">
          <svg width={size} height={size} viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51z" fill={color}/>
          </svg>
          <svg width={size} height={size} viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '-2px' }}>
            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51z" fill={color}/>
          </svg>
        </span>
      );
    } else if (status === 'delivered') {
      // Double gray ticks (delivered) merged together
      return (
        <span className="inline-flex items-center" style={{ gap: '0px', marginLeft: '-2px' }} title="Delivered">
          <svg width={size} height={size} viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51z" fill={color}/>
          </svg>
          <svg width={size} height={size} viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '-2px' }}>
            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51z" fill={color}/>
          </svg>
        </span>
      );
    } else {
      // Single gray tick (sent)
      return (
        <span className="inline-flex items-center" title="Sent">
          <svg width={size} height={size} viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51z" fill={color}/>
          </svg>
        </span>
      );
    }
  };

  const getMessageStatusIcon = (msg) => {
    // Only show status for messages sent by current user
    const isOwnMessage = msg.sender === user.id || msg.sender?._id === user.id;
    if (!isOwnMessage) return null;
    
    return <WhatsAppTick status={msg.status} />;
  };

  if (loading) return <Loading text="Loading chats..." />;

  return (
    <div className="h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100 flex flex-col overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* Modern Header */}
      <div className="bg-transparent border-b border-amber-100/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="text-amber-600" size={28} />
                Messages
              </h1>
              {getTotalUnreadCount() > 0 && (
                <p className="text-sm text-amber-600 font-medium mt-0.5">
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
                className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-5 py-2.5 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
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
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-100/50 max-w-md w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-6 text-white">
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
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
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
                        className="flex items-center space-x-3 p-4 hover:bg-amber-50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-amber-200"
                      >
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white font-bold shadow-md">
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
                        <MessageCircle className="text-amber-600" size={20} />
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
      <div className="flex-1 container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="bg-transparent rounded-xl sm:rounded-2xl overflow-hidden flex flex-col sm:flex-row h-full">
          {/* Sidebar - Chat List */}
          <div className={`${selectedChat ? 'hidden sm:flex' : 'flex'} w-full sm:w-96 border-r border-amber-100/50 flex-col bg-transparent`}>
            {/* Instagram-like Tabs */}
            <div className="p-5 border-b border-amber-100/50 bg-transparent">
              <div className="flex space-x-1 border-b border-amber-100/50">
                <button
                  onClick={() => setActiveTab('chats')}
                  className={`flex-1 py-3 text-center font-semibold transition-colors relative ${
                    activeTab === 'chats'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Chats
                  {activeTab === 'chats' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 py-3 text-center font-semibold transition-colors relative ${
                    activeTab === 'requests'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Message Requests
                  {messageRequests.length > 0 && (
                    <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">
                      {messageRequests.length}
                    </span>
                  )}
                  {activeTab === 'requests' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
                  )}
                </button>
              </div>
            </div>
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {activeTab === 'chats' ? (
            chats.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
                  <MessageCircle className="text-amber-600" size={32} />
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
                  key={`chat-${chat._id}`}
                      onClick={() => handleSelectChat(chat)}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        selectedChat?._id === chat._id 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md' 
                          : 'hover:bg-white/80 hover:shadow-sm border border-transparent hover:border-amber-200'
                      }`}
                    >
                    <div className="flex items-start space-x-3">
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full ${selectedChat?._id === chat._id ? 'ring-2 ring-white' : ''} flex items-center justify-center text-white font-bold shadow-md`}>
                          {otherUser?.profilePicture ? (
                            <img src={otherUser.profilePicture} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-sm">
                              {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <span className={`font-semibold truncate ${selectedChat?._id === chat._id ? 'text-white' : 'text-gray-900'}`}>
                              {otherUser?.name || 'Unknown User'}
                            </span>
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
                            {chat.lastMessageContent || lastMsg?.content || (isPending && !isInitiator ? 'New chat request' : 'No messages yet')}
                          </p>
                          {unreadCount > 0 && (
                            <span className={`ml-2 text-xs font-bold rounded-full px-2.5 py-1 min-w-[24px] text-center flex-shrink-0 ${
                              selectedChat?._id === chat._id 
                                ? 'bg-white text-amber-600' 
                                : 'bg-amber-500 text-white'
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
            )
          ) : (
            // Message Requests Tab
            messageRequests.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-50 flex items-center justify-center">
                  <FaUserClock className="text-yellow-600" size={32} />
                </div>
                <p className="text-gray-900 font-medium mb-2">No message requests</p>
                <p className="text-sm text-gray-500">When someone sends you a message, it will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {messageRequests.map((request) => {
                  const otherUser = getOtherUser(request);
                  const lastMsg = request.messages[request.messages.length - 1];
                  const isOnline = isUserOnline(otherUser?._id);
                  
                  return (
                    <div
                      key={`request-${request._id}`}
                      onClick={() => handleSelectChat(request)}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        selectedChat?._id === request._id 
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md' 
                          : 'hover:bg-white hover:shadow-sm bg-yellow-50/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full ${selectedChat?._id === request._id ? 'ring-2 ring-white' : ''} flex items-center justify-center text-white font-bold shadow-md`}>
                            {otherUser?.profilePicture ? (
                              <img src={otherUser.profilePicture} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-sm">
                                {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <span className={`font-semibold truncate ${selectedChat?._id === request._id ? 'text-white' : 'text-gray-900'}`}>
                                {otherUser?.name || 'Unknown User'}
                              </span>
                              <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium flex-shrink-0">New</span>
                            </div>
                            {lastMsg && (
                              <span className={`text-xs ml-2 flex-shrink-0 ${selectedChat?._id === request._id ? 'text-white/80' : 'text-gray-500'}`}>
                                {formatRelativeTime(lastMsg.timestamp)}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm truncate ${selectedChat?._id === request._id ? 'text-white/90' : 'text-gray-600'}`}>
                            {lastMsg?.content || 'New chat request'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`${selectedChat || newChatUser ? 'flex' : 'hidden'} sm:flex flex-1 flex-col`} style={{ minHeight: 0, height: 'calc(100vh - 80px)' }}>
          {newChatUser ? (
            <>
              {/* New Chat Header */}
              <div className="p-5 border-b border-amber-100/50 bg-transparent flex justify-between items-center">
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

              {/* Empty Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-amber-50/30 via-yellow-50/30 to-yellow-100/30">
              </div>

              {/* Message Input */}
              <div className="p-5 bg-white/60 backdrop-blur-sm border-t border-amber-100/50 sticky bottom-0 z-10" style={{ marginBottom: '0' }}>
                <form onSubmit={handleSendMessage} className="flex flex-col space-y-3">
                  <div className="flex space-x-3">
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={message}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Capitalize first character if it's the first character
                        if (value.length === 1 && message.length === 0) {
                          value = value.charAt(0).toUpperCase();
                        }
                        setMessage(value);
                      }}
                      onKeyDown={(e) => {
                        // Capitalize first character on first key press
                        if (message.length === 0 && e.key.length === 1 && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                          e.preventDefault();
                          setMessage(e.key.toUpperCase());
                        }
                      }}
                      placeholder="Type your first message..."
                      className="flex-1 px-5 py-3 border-2 border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm transition"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
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
              <div className="p-4 sm:p-5 border-b border-amber-100/50 bg-transparent flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <button
                    onClick={handleBackToList}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition flex-shrink-0 sm:hidden"
                    title="Back to chats"
                  >
                    <FaArrowLeft size={18} />
                  </button>
                  <button
                    onClick={handleBackToList}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition hidden sm:block"
                    title="Back to chats (ESC)"
                  >
                    <FaArrowLeft size={18} />
                  </button>
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white">
                      {getOtherUser(selectedChat)?.profilePicture ? (
                        <img 
                          src={getOtherUser(selectedChat).profilePicture} 
                          alt={getOtherUser(selectedChat).name} 
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-md" 
                        />
                      ) : (
                        <span className="text-base sm:text-lg font-bold">
                          {getOtherUser(selectedChat)?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    {isUserOnline(getOtherUser(selectedChat)?._id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleViewProfile(getOtherUser(selectedChat)?._id)}
                      className="font-semibold text-gray-900 hover:text-amber-600 transition text-left text-base sm:text-lg truncate block w-full"
                    >
                      {getOtherUser(selectedChat)?.name}
                    </button>
                    <div className="text-xs sm:text-sm text-gray-500 flex items-center space-x-1.5">
                      <span>{getOtherUser(selectedChat)?.department} • {getOtherUser(selectedChat)?.role}</span>
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
                      <HiUserAdd className="text-lg" />
                      <span className="text-sm">Unblock</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleBlockUser}
                      className="text-orange-600 hover:text-orange-800 p-2"
                      title="Block user"
                    >
                      <MdPersonOff className="text-lg" />
                    </button>
                  )}
                  <button
                    onClick={handleDeleteChat}
                    className="text-red-600 hover:text-red-800 p-2"
                    title="Delete conversation"
                  >
                    <MdDelete className="text-lg" />
                  </button>
                </div>
              </div>

              {/* Blocked Status Banner */}
              {isUserBlocked(getOtherUser(selectedChat)?._id) && (
                <div className="bg-red-50 border-b border-red-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MdPersonOff className="text-red-600 text-xl" />
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

              {/* Delete Request Banner - For the user who received the request */}
              {selectedChat.deleteRequestStatus === 'pending' && selectedChat.deleteRequestedBy && selectedChat.deleteRequestedBy !== user.id && selectedChat.deleteRequestedBy?._id !== user.id && (
                <div className="bg-red-50 border-b border-red-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MdDelete className="text-red-600 text-xl" />
                      <div>
                        <p className="font-semibold text-gray-900">Delete Chat Request</p>
                        <p className="text-sm text-gray-600">{getOtherUser(selectedChat)?.name} wants to delete this chat</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleApproveDeleteRequest}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
                      >
                        <FaCheck />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={handleDeclineDeleteRequest}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center space-x-2"
                      >
                        <FaTimes />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Request Banner - For the user who sent the request */}
              {selectedChat.deleteRequestStatus === 'pending' && selectedChat.deleteRequestedBy && (selectedChat.deleteRequestedBy === user.id || selectedChat.deleteRequestedBy?._id === user.id) && (
                <div className="bg-orange-50 border-b border-orange-200 p-4">
                  <div className="flex items-center space-x-3 text-orange-900">
                    <MdDelete className="text-orange-600 text-xl" />
                    <div>
                      <p className="font-semibold">Delete Request Pending</p>
                      <p className="text-sm text-orange-700">Waiting for {getOtherUser(selectedChat)?.name} to approve the delete request</p>
                    </div>
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


              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-amber-50/30 via-yellow-50/30 to-yellow-100/30 chat-messages" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                {selectedChat.messages.length > 0 && (
                  selectedChat.messages.map((msg, index) => {
                    // Normalize sender ID for comparison (handles both object and string IDs)
                    const getSenderId = (sender) => {
                      if (!sender) return null;
                      return typeof sender === 'string' ? sender : sender._id?.toString() || sender.toString();
                    };
                    
                    const msgSenderId = getSenderId(msg.sender);
                    const currentUserId = user.id?.toString() || user.id;
                    const isOwn = msgSenderId === currentUserId;
                    
                    // Get previous message for grouping logic
                    const prevMsg = index > 0 ? selectedChat.messages[index - 1] : null;
                    const prevSenderId = prevMsg ? getSenderId(prevMsg.sender) : null;
                    
                    // Show avatar only for first message in a sequence from the same sender
                    // Also show if previous message is from different sender or if it's the first message
                    const isFirstInSequence = index === 0 || prevSenderId !== msgSenderId;
                    const showAvatar = !isOwn && isFirstInSequence;
                    
                    // Show date separator if this is a different day than previous message
                    const showDateSeparator = !prevMsg || isDifferentDay(msg.timestamp, prevMsg.timestamp);
                    
                    // Determine spacing: reduce spacing for consecutive messages from same sender
                    // Only add top margin if it's first in sequence or has date separator
                    const messageSpacing = isFirstInSequence || showDateSeparator ? 'mt-4' : 'mt-1';
                    
                    return (
                      <div key={msg._id ? `msg-${msg._id}` : `msg-${selectedChat._id}-${index}`} className={messageSpacing}>
                        {/* Date Separator */}
                        {showDateSeparator && (
                          <div className="flex justify-center my-5 sm:my-6">
                            <div className="bg-white/60 backdrop-blur-sm border border-amber-200/50 text-gray-600 text-xs sm:text-sm px-4 py-1.5 rounded-full">
                              {formatChatDate(msg.timestamp)}
                            </div>
                          </div>
                        )}
                        
                        {/* Message Container - Proper alignment: own messages right, incoming left */}
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end ${!isOwn ? 'space-x-2' : ''}`}>
                          {/* Avatar for incoming messages - only show for first in sequence */}
                          {showAvatar && (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex-shrink-0 shadow-md">
                              {msg.sender?.profilePicture ? (
                                <img src={msg.sender.profilePicture} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                                  {getOtherUser(selectedChat)?.name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Spacer for incoming messages when avatar is hidden (maintains alignment) */}
                          {!isOwn && !showAvatar && <div className="w-9 sm:w-10 flex-shrink-0" />}
                          
                          {/* Message Bubble */}
                          <div className={`group relative max-w-[85%] sm:max-w-xs lg:max-w-md ${isOwn ? 'ml-auto' : ''}`}>
                            <div
                              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl ${
                                msg.isDeleted
                                  ? 'bg-gray-100 text-gray-500 italic border border-gray-200'
                                  : isOwn
                                  ? 'bg-white/60 backdrop-blur-sm text-gray-900 rounded-br-sm border border-amber-200/50'
                                  : 'bg-white/60 backdrop-blur-sm text-gray-900 rounded-bl-sm border border-amber-200/50'
                              }`}
                            >
                              <p className={`text-sm sm:text-base break-words leading-relaxed text-gray-900`}>{msg.content}</p>
                              <div className={`flex items-center justify-end space-x-1.5 sm:space-x-2 mt-2`}>
                                <span className={`text-[10px] sm:text-xs font-medium text-gray-500`}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isOwn && !msg.isDeleted && (
                                  <span className="ml-1 flex items-center">
                                    {getMessageStatusIcon(msg)}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Delete menu button (only for own messages) */}
                            {isOwn && !msg.isDeleted && (
                              <button
                                onClick={() => setShowDeleteMenu(showDeleteMenu === msg._id ? null : msg._id)}
                                className="absolute -right-10 sm:-right-12 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-600 bg-white/60 backdrop-blur-sm rounded-full p-1.5 border border-amber-200/50"
                              >
                                <FaEllipsisV className="text-xs" />
                              </button>
                            )}
                            
                            {/* Delete menu dropdown */}
                            {showDeleteMenu === msg._id && (
                              <div className="absolute right-0 top-full mt-2 bg-white/60 backdrop-blur-sm rounded-xl border border-amber-200/50 py-2 z-20 min-w-[120px]">
                                <button
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition"
                                >
                                  <MdDelete className="text-xs" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator */}
              {typingUsers[getOtherUser(selectedChat)?._id] && (
                <div className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-amber-100/50 text-sm text-gray-600 rounded-lg mx-4 mb-2">
                  <span className="italic">{getOtherUser(selectedChat)?.name} is typing...</span>
                </div>
              )}

              {/* Message Input */}
              <div className="p-5 bg-white/60 backdrop-blur-sm border-t border-amber-100/50 sticky bottom-0 z-10" style={{ marginBottom: '0' }}>
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
                        <div className="flex space-x-2 sm:space-x-3">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={message}
                            onChange={(e) => handleTyping(e.target.value)}
                            onKeyDown={(e) => {
                              // Capitalize first character on first key press
                              if (message.length === 0 && e.key.length === 1 && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                                setMessage(e.key.toUpperCase());
                              }
                            }}
                            placeholder={isPending ? `Send up to ${messagesLeft} message${messagesLeft !== 1 ? 's' : ''}...` : "Type a message..."}
                            className="flex-1 px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base border-2 border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm transition"
                  />
                  <button
                    type="submit"
                            disabled={!message.trim()}
                            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 sm:space-x-2 shadow-md hover:shadow-lg"
                  >
                    <FaPaperPlane className="text-sm sm:text-base" />
                            <span className="font-medium text-sm sm:text-base hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
                    );
                  } else {
                    return (
                      <div className="text-center text-gray-500 py-3">
                        <p className="text-sm">
                          {isPending && isInitiator 
                            ? 'Waiting for approval...'
                            : 'Accept the chat request to start messaging'}
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-amber-50/30 via-yellow-50/30 to-yellow-100/30">
              <div className="text-center px-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center">
                  <MessageCircle className="text-amber-600" size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Your Messages</h3>
                <p className="text-gray-600 mb-4">Select a conversation to start chatting</p>
                <button
                  onClick={() => setShowSearch(true)}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg transform hover:scale-105 inline-flex items-center gap-2"
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
