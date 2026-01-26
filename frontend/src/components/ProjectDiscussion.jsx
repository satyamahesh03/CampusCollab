import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { FaComment, FaReply, FaPaperPlane, FaThumbsUp } from 'react-icons/fa';
import { projectAPI } from '../utils/api';
import { useGlobal } from '../context/GlobalContext';
import { formatRelativeTime } from '../utils/helpers';

// Recursive Reply Tree Component
const ReplyTree = ({
  reply,
  commentId,
  depth,
  userId,
  loading,
  projectStatus,
  onVote,
  onDelete,
  onReply,
  replyingTo,
  replyText,
  setReplyText,
  onAddReply,
  handleUserClick,
  formatRelativeTime,
  getVoteScore,
  getUserVote,
  confirmingDeleteReply,
  setConfirmingDeleteReply
}) => {
  const replyVoteScore = getVoteScore(reply);
  const replyUserVote = getUserVote(reply);
  const isReplyUpvoted = replyUserVote === 'upvote';
  // Maximum depth is 2 (3 levels total: Comment -> Reply -> Reply -> Reply)
  const maxDepth = 2;
  const canReply = depth < maxDepth;
  const replyKey = `${commentId}-${reply._id}`;
  const isReplying = replyingTo === replyKey;

  return (
    <div
      className={`flex items-start ${depth > 0 ? 'ml-4 pl-4 border-l-2 border-gray-200' : ''}`}
      data-reply-id={reply._id}
    >
      {/* Reply Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleUserClick(reply.user?._id)}
              className="font-semibold text-xs text-gray-900 hover:text-amber-600 transition cursor-pointer"
            >
              {reply.user?.name || 'Unknown User'}
            </button>
            <span className="text-gray-500 text-xs">
              {formatRelativeTime(reply.createdAt)}
            </span>
          </div>
          {/* Delete button for reply owner */}
          {(reply.user?._id === userId || reply.user === userId) && (
            confirmingDeleteReply === `${commentId}-${reply._id}` ? (
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(commentId, reply._id);
                  }}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 transition-all px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  Delete
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmingDeleteReply(null);
                  }}
                  disabled={loading}
                  className="text-gray-600 hover:text-gray-700 transition-all px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmingDeleteReply(`${commentId}-${reply._id}`);
                }}
                disabled={loading}
                className="text-red-500 hover:text-red-700 transition-all p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
                title="Delete reply"
                type="button"
              >
                <FontAwesomeIcon icon={faTrashCan} className="text-xs transition-transform" />
              </button>
            )
          )}
        </div>
        <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed mb-2">{reply.text}</p>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
          {/* Vote Button */}
          <button
            onClick={() => onVote(commentId, reply._id, 'upvote')}
            disabled={loading || projectStatus === 'closed'}
            className={`flex items-center space-x-1.5 transition font-medium ${isReplyUpvoted
                ? 'text-orange-500 hover:text-orange-600'
                : 'text-gray-500 hover:text-orange-500'
              } ${projectStatus === 'closed' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title="Vote"
          >
            <FaThumbsUp className="text-xs" />
            <span>Vote</span>
            {replyVoteScore > 0 && <span className="text-xs">({replyVoteScore})</span>}
          </button>
          {/* Reply button */}
          {canReply && projectStatus !== 'closed' && (
            <button
              onClick={() => onReply(reply._id)}
              className="flex items-center space-x-1 hover:text-amber-600 transition font-medium"
            >
              <FaReply className="text-xs" />
              <span>Reply</span>
            </button>
          )}
        </div>

        {/* Reply Input */}
        {isReplying && (
          <div className="mt-2" style={{ direction: 'ltr', minHeight: '80px' }}>
            <textarea
              value={replyText}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setReplyText(e.target.value);
                }
              }}
              placeholder="Write your reply..."
              dir="ltr"
              maxLength={200}
              className="w-full px-3 py-2 border border-amber-200/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none resize-none bg-amber-50 text-sm"
              rows={2}
              autoFocus
              style={{
                direction: 'ltr',
                textAlign: 'left',
                unicodeBidi: 'embed',
                writingMode: 'horizontal-tb'
              }}
              onFocus={(e) => {
                const target = e.target;
                target.setAttribute('dir', 'ltr');
                target.style.direction = 'ltr';
                target.style.textAlign = 'left';
                const len = target.value.length;
                target.setSelectionRange(len, len);
              }}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText('');
                }}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAddReply(commentId, reply._id);
                }}
                disabled={loading || !replyText.trim()}
                className="px-4 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-xs font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane className="text-xs" />
                <span>Reply</span>
              </button>
            </div>
          </div>
        )}

        {/* Nested Replies - Recursive */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {reply.replies
              .sort((a, b) => {
                const scoreA = getVoteScore(a);
                const scoreB = getVoteScore(b);
                return scoreB - scoreA;
              })
              .map((nestedReply, nestedIndex) => (
                <ReplyTree
                  key={nestedReply._id || nestedIndex}
                  reply={nestedReply}
                  commentId={commentId}
                  depth={depth + 1}
                  userId={userId}
                  loading={loading}
                  projectStatus={projectStatus}
                  onVote={onVote}
                  onDelete={onDelete}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onAddReply={onAddReply}
                  handleUserClick={handleUserClick}
                  confirmingDeleteReply={confirmingDeleteReply}
                  setConfirmingDeleteReply={setConfirmingDeleteReply}
                  formatRelativeTime={formatRelativeTime}
                  getVoteScore={getVoteScore}
                  getUserVote={getUserVote}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectDiscussion = ({
  projectId,
  projectData,
  userId,
  loading: parentLoading,
  onProjectUpdate
}) => {
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // Format: "commentId" or "commentId-replyId"
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmingDeleteComment, setConfirmingDeleteComment] = useState(null);
  const [confirmingDeleteReply, setConfirmingDeleteReply] = useState(null);
  const { addNotification } = useGlobal();
  const navigate = useNavigate();

  // Calculate vote score for a comment or reply
  const getVoteScore = (item) => {
    if (!item) return 0;
    const upvotes = item.upvotes?.length || 0;
    const downvotes = item.downvotes?.length || 0;
    return upvotes - downvotes;
  };

  // Check if user has voted
  const getUserVote = (item) => {
    if (!userId || !item) return null;
    const hasUpvoted = item.upvotes?.some(id =>
      id === userId || id?._id === userId || id?.toString() === userId?.toString()
    );
    const hasDownvoted = item.downvotes?.some(id =>
      id === userId || id?._id === userId || id?.toString() === userId?.toString()
    );
    if (hasUpvoted) return 'upvote';
    if (hasDownvoted) return 'downvote';
    return null;
  };

  const handleUserClick = (clickedUserId) => {
    if (!clickedUserId) return;
    navigate(`/profile?userId=${clickedUserId}`);
  };

  // Handle voting on comment
  const handleVoteComment = async (commentId, voteType) => {
    try {
      setLoading(true);
      const response = await projectAPI.voteComment(projectId, commentId, voteType);
      if (onProjectUpdate) {
        onProjectUpdate(response.data);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to vote on comment'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle voting on reply
  const handleVoteReply = async (commentId, replyId, voteType) => {
    try {
      setLoading(true);
      const response = await projectAPI.voteReply(projectId, commentId, replyId, voteType);
      if (onProjectUpdate) {
        onProjectUpdate(response.data);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to vote on reply'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (commentId) => {
    try {
      setLoading(true);
      setConfirmingDeleteComment(null);
      const response = await projectAPI.deleteComment(projectId, commentId);
      if (onProjectUpdate) {
        onProjectUpdate(response.data);
      }
      addNotification({
        type: 'success',
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to delete comment'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a reply
  const handleDeleteReply = async (commentId, replyId) => {
    try {
      setLoading(true);
      setConfirmingDeleteReply(null);
      const response = await projectAPI.deleteReply(projectId, commentId, replyId);
      if (onProjectUpdate) {
        onProjectUpdate(response.data);
      }
      addNotification({
        type: 'success',
        message: 'Reply deleted'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to delete reply'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setLoading(true);
      const response = await projectAPI.addComment(projectId, { text: comment });
      if (onProjectUpdate) {
        onProjectUpdate(response.data || await projectAPI.getById(projectId).then(r => r.data));
      }
      setComment('');
      addNotification({
        type: 'success',
        message: 'Comment added!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Abusive words are not allowed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (commentId, parentReplyId = null) => {
    if (!replyText.trim()) return;

    try {
      setLoading(true);
      const response = await projectAPI.addReply(projectId, commentId, { text: replyText }, parentReplyId);
      if (onProjectUpdate) {
        onProjectUpdate(response.data);
      }
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to add reply',
      });
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || parentLoading;

  return (
    <div>
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
        Discussion ({projectData.comments?.length || 0})
      </h3>

      {/* Add Comment Form - Reddit Style "Join Conversation" */}
      {projectData.status !== 'closed' ? (
        <div className="mb-4 sm:mb-6 bg-amber-50 rounded-lg p-3 sm:p-4 border border-amber-100/50">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Join the conversation</h4>
          <form onSubmit={handleAddComment} style={{ direction: 'ltr' }}>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
              }}
              placeholder="Share are your thoughts?"
              dir="ltr"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-amber-200/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none resize-none bg-amber-50 text-sm sm:text-base"
              rows={4}
              style={{
                direction: 'ltr',
                textAlign: 'left',
                unicodeBidi: 'embed',
                writingMode: 'horizontal-tb'
              }}
              onFocus={(e) => {
                const target = e.target;
                target.setAttribute('dir', 'ltr');
                target.style.direction = 'ltr';
                target.style.textAlign = 'left';
                const len = target.value.length;
                target.setSelectionRange(len, len);
              }}
            />
            <div className="flex justify-end mt-2 sm:mt-3">
              <button
                type="submit"
                disabled={isLoading || !comment.trim()}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane className="text-xs" />
                <span>Share</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-4 sm:mb-6 p-4 bg-gray-100 rounded-lg text-center text-gray-600 text-sm">
          This project is closed. No new comments can be added.
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {projectData.comments?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaComment className="mx-auto text-4xl mb-2 opacity-50" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          // Sort comments by vote score (top voted first)
          [...(projectData.comments || [])]
            .sort((a, b) => {
              const scoreA = getVoteScore(a);
              const scoreB = getVoteScore(b);
              return scoreB - scoreA; // Descending order
            })
            .map((comment, index) => {
              const voteScore = getVoteScore(comment);
              const userVote = getUserVote(comment);
              const isUpvoted = userVote === 'upvote';
              const isDownvoted = userVote === 'downvote';
              const commentKey = comment._id;
              const isReplyingToComment = replyingTo === commentKey;

              return (
                <motion.div
                  key={comment._id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-amber-50 rounded-lg border border-amber-200/50 hover:border-amber-300 transition"
                  data-comment-id={comment._id}
                >
                  {/* Comment Content */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUserClick(comment.user?._id)}
                          className="font-semibold text-sm text-gray-900 hover:text-amber-600 transition cursor-pointer"
                        >
                          {comment.user?.name || 'Unknown User'}
                        </button>
                        <span className="text-gray-500 text-xs">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      {/* Delete button for comment owner */}
                      {(comment.user?._id === userId || comment.user === userId) && (
                        confirmingDeleteComment === comment._id ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteComment(comment._id);
                              }}
                              disabled={isLoading}
                              className="text-red-600 hover:text-red-700 transition-all px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              type="button"
                            >
                              Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmingDeleteComment(null);
                              }}
                              disabled={isLoading}
                              className="text-gray-600 hover:text-gray-700 transition-all px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConfirmingDeleteComment(comment._id);
                            }}
                            disabled={isLoading}
                            className="text-red-500 hover:text-red-700 transition-all p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
                            title="Delete comment"
                            type="button"
                          >
                            <FontAwesomeIcon icon={faTrashCan} className="text-xs transition-transform" />
                          </button>
                        )
                      )}
                    </div>
                    <p className="text-gray-700 text-sm sm:text-base whitespace-pre-wrap leading-relaxed mb-3">{comment.text}</p>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-4 text-xs sm:text-sm text-gray-500 mb-3">
                      {/* Vote Button */}
                      <button
                        onClick={() => handleVoteComment(comment._id, 'upvote')}
                        disabled={isLoading || projectData.status === 'closed'}
                        className={`flex items-center space-x-1.5 transition font-medium ${isUpvoted
                            ? 'text-orange-500 hover:text-orange-600'
                            : 'text-gray-500 hover:text-orange-500'
                          } ${projectData.status === 'closed' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title="Vote"
                      >
                        <FaThumbsUp className="text-sm" />
                        <span>Vote</span>
                        {voteScore > 0 && <span className="text-xs">({voteScore})</span>}
                      </button>
                      {/* Reply button */}
                      {projectData.status !== 'closed' && (
                        <button
                          onClick={() => {
                            setReplyingTo(commentKey);
                            setReplyText('');
                          }}
                          className="flex items-center space-x-1 hover:text-amber-600 transition font-medium"
                        >
                          <FaReply className="text-sm" />
                          <span>Reply</span>
                        </button>
                      )}
                    </div>

                    {/* Reply Input for Comment */}
                    {isReplyingToComment && (
                      <div className="mt-3" style={{ direction: 'ltr', minHeight: '80px' }}>
                        <textarea
                          value={replyText}
                          onChange={(e) => {
                            if (e.target.value.length <= 200) {
                              setReplyText(e.target.value);
                            }
                          }}
                          placeholder="Write your reply..."
                          dir="ltr"
                          maxLength={200}
                          className="w-full px-3 py-2 border border-amber-200/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none resize-none bg-amber-50 text-sm"
                          rows={2}
                          autoFocus
                          style={{
                            direction: 'ltr',
                            textAlign: 'left',
                            unicodeBidi: 'embed',
                            writingMode: 'horizontal-tb'
                          }}
                          onFocus={(e) => {
                            const target = e.target;
                            target.setAttribute('dir', 'ltr');
                            target.style.direction = 'ltr';
                            target.style.textAlign = 'left';
                            const len = target.value.length;
                            target.setSelectionRange(len, len);
                          }}
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-700 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              handleAddReply(comment._id);
                            }}
                            disabled={isLoading || !replyText.trim()}
                            className="px-4 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-xs font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaPaperPlane className="text-xs" />
                            <span>Reply</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Recursive Reply Tree */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {comment.replies
                          .sort((a, b) => {
                            const scoreA = getVoteScore(a);
                            const scoreB = getVoteScore(b);
                            return scoreB - scoreA;
                          })
                          .map((reply, replyIndex) => (
                            <ReplyTree
                              key={reply._id || replyIndex}
                              reply={reply}
                              commentId={comment._id}
                              depth={0}
                              userId={userId}
                              loading={isLoading}
                              projectStatus={projectData.status}
                              onVote={handleVoteReply}
                              onDelete={handleDeleteReply}
                              onReply={(parentReplyId) => {
                                setReplyingTo(`${comment._id}-${parentReplyId}`);
                                setReplyText('');
                              }}
                              replyingTo={replyingTo}
                              replyText={replyText}
                              confirmingDeleteReply={confirmingDeleteReply}
                              setConfirmingDeleteReply={setConfirmingDeleteReply}
                              setReplyText={setReplyText}
                              onAddReply={handleAddReply}
                              handleUserClick={handleUserClick}
                              formatRelativeTime={formatRelativeTime}
                              getVoteScore={getVoteScore}
                              getUserVote={getUserVote}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
        )}
      </div>
    </div>
  );
};

export default ProjectDiscussion;

