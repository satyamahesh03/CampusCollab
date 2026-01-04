import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FaUsers, FaComment, FaPaperPlane, FaUserPlus } from 'react-icons/fa';
import { projectAPI } from '../utils/api';
import { useGlobal } from '../context/GlobalContext';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTime } from '../utils/helpers';
import socketService from '../utils/socket';
import Loading from './Loading';

const ProjectTeamChat = ({ 
  projectId, 
  projectData, 
  isOwner, 
  userId, 
  pendingRequestsCount,
  onApproveRequest,
  onRejectRequest,
  onUserClick,
  loading,
  onProjectUpdate
}) => {
  const [showTeamChat, setShowTeamChat] = useState(false);
  const [teamChatMessages, setTeamChatMessages] = useState([]);
  const [teamChatMessage, setTeamChatMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef(null);
  const { addNotification } = useGlobal();
  const { user } = useAuth();

  // Fetch team chat messages and refresh project data when chat opens
  useEffect(() => {
    if (showTeamChat && projectId) {
      fetchTeamChatMessages();
      // Refresh project data to get latest join requests
      if (onProjectUpdate) {
        onProjectUpdate();
      }
    }
  }, [showTeamChat, projectId]);

  // Socket listeners for team chat
  useEffect(() => {
    if (projectId && user?.id) {
      // Ensure socket is connected
      if (!socketService.socket || !socketService.socket.connected) {
        socketService.connect(user.id);
      }
      
      socketService.joinProjectChat(projectId);
      
      const handleNewMessage = (data) => {
        if (data.projectId === projectId) {
          setTeamChatMessages(prev => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(msg => 
              msg._id === data.message._id || 
              (msg.user?._id === data.message.user?._id && 
               msg.content === data.message.content &&
               Math.abs(new Date(msg.createdAt) - new Date(data.message.createdAt)) < 1000)
            );
            if (messageExists) return prev;
            return [...prev, data.message];
          });
          scrollToBottom();
        }
      };

      socketService.onNewProjectChatMessage(handleNewMessage);

      return () => {
        socketService.leaveProjectChat(projectId);
        socketService.off('new-project-chat-message');
      };
    }
  }, [projectId, user?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (showTeamChat) {
      scrollToBottom();
    }
  }, [teamChatMessages, showTeamChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        const container = messagesEndRef.current.closest('.overflow-y-auto');
        if (container) {
          container.scrollTop = container.scrollHeight;
        } else {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 100);
  };

  const fetchTeamChatMessages = async () => {
    try {
      setLoadingChat(true);
      const response = await projectAPI.getTeamChat(projectId);
      setTeamChatMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching team chat:', error);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendTeamChatMessage = async (e) => {
    e.preventDefault();
    if (!teamChatMessage.trim()) return;

    try {
      const content = teamChatMessage.trim();
      setTeamChatMessage('');

      // Send via API (which will save to DB and emit socket event to all participants)
      await projectAPI.sendTeamChatMessage(projectId, content);
      
      // The socket listener will handle adding the message to the UI in real-time
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to send message'
      });
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FaUsers className="text-amber-600" />
          Team Chat
        </h3>
        <button
          onClick={() => setShowTeamChat(!showTeamChat)}
          className="flex items-center gap-2 p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
        >
          <FontAwesomeIcon icon={['far', 'message']} />
          <span>{showTeamChat ? 'Hide' : 'Show'}</span>
        </button>
      </div>

      {showTeamChat && (
        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-amber-100/50 overflow-hidden flex flex-col" style={{ height: '400px' }}>
          {/* Chat Header with Participants */}
          <div className="px-4 py-3 border-b border-amber-100/50 bg-amber-50/50 flex items-center justify-between">
            {!isOwner && (
              <div className="flex items-center gap-2">
                <FaUsers className="text-amber-600" />
                <span className="text-sm font-medium text-gray-900">
                  {projectData.participants?.length || 0} Team Members
                </span>
              </div>
            )}
            {isOwner && pendingRequestsCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-700 bg-amber-200 px-2 py-1 rounded-full">
                  {pendingRequestsCount} New Request{pendingRequestsCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
            style={{ 
              maxHeight: '300px',
              overscrollBehavior: 'contain',
              scrollBehavior: 'smooth'
            }}
            onWheel={(e) => {
              // Prevent page scroll when scrolling in chat
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Prevent page scroll on mobile
              e.stopPropagation();
            }}
          >
            {loadingChat ? (
              <div className="flex justify-center items-center h-full">
                <Loading />
              </div>
            ) : teamChatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FaComment className="text-4xl mb-2 opacity-50" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              teamChatMessages.map((msg, index) => {
                const isOwnMessage = msg.user?._id === userId || msg.user === userId || msg.user?.toString() === userId?.toString();
                return (
                  <div
                    key={msg._id || index}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                      {!isOwnMessage && (
                        <p className="text-xs text-gray-600 mb-1 px-2">
                          {msg.user?.name || 'Unknown User'}
                        </p>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          isOwnMessage
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 px-2">
                        {formatRelativeTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendTeamChatMessage} className="px-4 py-3 border-t border-amber-100/50 bg-white/60">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={teamChatMessage}
                onChange={(e) => setTeamChatMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-amber-200/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!teamChatMessage.trim()}
                className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane className="text-sm" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Requests in Chat - For Owner */}
      {isOwner && showTeamChat && pendingRequestsCount > 0 && (
        <div className="mt-4 bg-amber-50 rounded-lg p-4 border border-amber-200">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FaUserPlus className="text-amber-600" />
            Pending Join Requests ({pendingRequestsCount})
          </h4>
          <div className="space-y-2">
            {projectData.joinRequests
              ?.filter(r => r.status === 'pending')
              .map((request) => (
                <div
                  key={request._id}
                  className="bg-white rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <button
                      onClick={() => onUserClick(request.user?._id)}
                      className="font-medium text-gray-900 hover:text-amber-600 transition cursor-pointer text-left"
                    >
                      {request.user?.name}
                    </button>
                    <p className="text-xs text-gray-600 mt-1">
                      {request.user?.email} • {request.user?.department}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onApproveRequest(request._id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onRejectRequest(request._id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTeamChat;

