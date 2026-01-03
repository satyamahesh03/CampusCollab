# Instagram-like Real-Time Chat System Documentation

## Overview
This document describes the implementation of a real-time chat system similar to Instagram, with message requests, approval system, and persistent chat URLs.

## Architecture

### Tech Stack
- **Frontend**: React with Socket.IO client
- **Backend**: Node.js + Express
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO with JWT authentication
- **Authentication**: JWT-based user authentication

## Database Schema

### Chat Model (`backend/models/Chat.js`)

```javascript
{
  participants: [ObjectId],      // Array of user IDs
  initiatedBy: ObjectId,          // User who started the chat
  status: String,                 // 'pending' | 'accepted' | 'rejected'
  deletedBy: [ObjectId],          // Array of user IDs who deleted the chat
  messages: [MessageSchema],      // Array of messages
  lastMessage: Date,              // Timestamp of last message
  unreadCount: Map,               // Map of userId -> unread count
  chatCode: String,               // Unique 8-character code for persistent URLs
  createdAt: Date
}
```

### Message Schema (embedded in Chat)

```javascript
{
  sender: ObjectId,                // User who sent the message
  content: String,                 // Message content
  status: String,                  // 'sent' | 'delivered' | 'read'
  isDeleted: Boolean,             // Soft delete flag
  timestamp: Date,                 // When message was sent
  readAt: Date                    // When message was read
}
```

## API Endpoints

### 1. Get Approved Chats
```
GET /api/chats
```
Returns all approved chats for the logged-in user (excluding deleted and rejected).

### 2. Get Message Requests
```
GET /api/chats/requests
```
Returns all pending message requests where the current user is NOT the initiator.

### 3. Get or Create Chat
```
GET /api/chats/:userId
```
Gets existing chat or creates a new one with the specified user. Automatically restores deleted chats.

### 4. Get Chat by Code
```
GET /api/chats/code/:chatCode
```
Retrieves a chat using its unique chatCode. Useful for persistent URLs.

### 5. Send Message
```
POST /api/chats/:chatId/message
```
Sends a message in a chat. Automatically restores chat if deleted by sender.

### 6. Approve Chat Request
```
PUT /api/chats/:chatId/approve
```
Approves a pending chat request and generates a unique chatCode.

### 7. Reject Chat Request
```
PUT /api/chats/:chatId/reject
```
Rejects a pending chat request.

### 8. Delete Chat
```
DELETE /api/chats/:chatId
```
Soft deletes a chat for the current user only (adds to deletedBy array).

## Socket.IO Events

### Client → Server

1. **user-online** (userId)
   - Notifies server that user is online
   - Validates userId matches authenticated user

2. **join-chat** (chatId)
   - Joins a chat room for real-time updates

3. **send-message** ({ chatId, userId, content })
   - Sends a real-time message
   - Validates user is participant
   - Restores chat if deleted by sender

4. **mark-read** ({ chatId, userId })
   - Marks messages as read

5. **typing** ({ chatId, userId, isTyping })
   - Sends typing indicator

6. **delete-message** ({ chatId, messageId, userId })
   - Deletes a message (soft delete)

7. **chat-approved** ({ chatId })
   - Notifies other users when chat is approved

8. **chat-rejected** ({ chatId })
   - Notifies other users when chat is rejected

### Server → Client

1. **new-message** ({ chatId, message, unreadCount })
   - Broadcasts new message to chat participants

2. **message-error** ({ message })
   - Sends error messages

3. **user-typing** ({ userId, isTyping })
   - Broadcasts typing status

4. **message-status-update** ({ messageId, status })
   - Updates message delivery/read status

5. **messages-read** ({ chatId })
   - Notifies when messages are read

6. **message-deleted** ({ chatId, messageId })
   - Notifies when message is deleted

7. **user-status-change** ({ userId, online, onlineUsers })
   - Broadcasts user online/offline status

8. **chat-status-changed** ({ chatId, status })
   - Notifies when chat status changes

## JWT Authentication in Socket.IO

Socket.IO connections are authenticated using JWT tokens:

```javascript
// Client sends token in auth object
io(SOCKET_URL, {
  auth: { token: localStorage.getItem('token') },
  extraHeaders: { Authorization: `Bearer ${token}` }
});

// Server validates token
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  socket.userId = user._id.toString();
  socket.user = user;
  next();
});
```

## Frontend Features

### Instagram-like UI

1. **Tab System**
   - **Chats Tab**: Shows all approved conversations
   - **Message Requests Tab**: Shows pending requests with badge count

2. **Message Request Flow**
   - First message goes to "Message Requests"
   - User can Approve or Reject
   - After approval, chat moves to "Chats" tab
   - Unique chatCode is generated for persistent URL

3. **Chat Deletion**
   - Soft delete: Only removes chat for the deleting user
   - Other user can still see and send messages
   - Chat is automatically restored when other user sends a message

4. **Persistent URLs**
   - Uses unique `chatCode` (8-character alphanumeric)
   - URL format: `/chats/{chatCode}`
   - ChatCode persists even if one user deletes the chat
   - Reuses chatCode if users have chatted before

5. **Real-time Features**
   - Instant message delivery
   - Typing indicators
   - Online/offline status
   - Message read receipts (delivered/read)
   - Date separators (Today, Yesterday, or date)

6. **Auto-focus & Capitalization**
   - Input field auto-focuses when selecting a chat
   - First character is automatically capitalized

## Security Features

1. **JWT Validation**: All Socket.IO connections require valid JWT
2. **User Verification**: Validates userId matches authenticated user
3. **Participant Check**: Ensures users can only access their chats
4. **Blocked Users**: Prevents messaging blocked users
5. **Message Limits**: Initiator can send max 2 messages before approval

## Message Request System

### Flow

1. **User A sends first message to User B**
   - Chat is created with `status: 'pending'`
   - Message is stored but not delivered to User B's inbox
   - Appears in User B's "Message Requests" tab

2. **User B sees request**
   - Request appears in "Message Requests" tab with badge count
   - Can preview the message
   - Options: Approve or Reject

3. **User B approves**
   - Chat status changes to `'accepted'`
   - Unique `chatCode` is generated
   - Chat moves from "Requests" to "Chats" tab
   - Both users can now message freely

4. **User B rejects**
   - Chat status changes to `'rejected'`
   - Chat is removed from requests
   - User A cannot send more messages

## Chat Deletion Behavior

- **Soft Delete**: Chat is not permanently deleted
- **Per-User**: Only affects the user who deleted it
- **Auto-Restore**: Chat is restored when:
  - Other user sends a message
  - User accesses chat via URL (chatCode)
  - User searches and selects the chat

## Unique Chat Code System

- **Generation**: 8-character alphanumeric code (e.g., "ABC12345")
- **Uniqueness**: Enforced at database level
- **Persistence**: Reused if users have chatted before
- **URL Format**: `/chats/{chatCode}`
- **Benefits**:
  - Stable URLs that don't change
  - Works even if one user deletes the chat
  - Easy to share chat links

## File Structure

```
backend/
  ├── models/
  │   └── Chat.js              # Chat and Message schemas
  ├── routes/
  │   └── chats.js             # REST API endpoints
  ├── middleware/
  │   └── auth.js              # JWT authentication
  └── server.js                # Socket.IO setup with JWT auth

frontend/
  ├── src/
  │   ├── pages/
  │   │   └── Chats.jsx        # Main chat UI with tabs
  │   ├── utils/
  │   │   ├── api.js           # API client
  │   │   └── socket.js        # Socket.IO client with JWT
  │   └── context/
  │       └── AuthContext.jsx  # JWT token management
```

## Key Implementation Details

### 1. Separate Endpoints for Chats and Requests
- `/api/chats` - Returns only approved chats
- `/api/chats/requests` - Returns only pending requests (where user is recipient)

### 2. Chat Restoration Logic
```javascript
// When fetching chat by userId
if (chat.deletedBy.includes(req.user._id)) {
  chat.deletedBy = chat.deletedBy.filter(id => id !== req.user._id);
  await chat.save();
}

// When sending message
if (chat.deletedBy.includes(userId)) {
  chat.deletedBy = chat.deletedBy.filter(id => id !== userId);
  await chat.save();
}
```

### 3. ChatCode Generation
```javascript
const generateChatCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
```

### 4. Message Request Filtering
```javascript
// Only show requests where user is NOT the initiator
const requests = await Chat.find({
  participants: req.user._id,
  status: 'pending',
  initiatedBy: { $ne: req.user._id }
});
```

## Testing Checklist

- [ ] Send first message creates pending request
- [ ] Request appears in "Message Requests" tab
- [ ] Approve request moves chat to "Chats" tab
- [ ] Reject request removes it from requests
- [ ] Deleted chat is restored when other user messages
- [ ] ChatCode persists in URL
- [ ] JWT authentication works for Socket.IO
- [ ] Real-time messages work instantly
- [ ] Typing indicators work
- [ ] Online/offline status updates
- [ ] Message read receipts work
- [ ] Date separators show correctly

## Future Enhancements

1. Message reactions (like Instagram)
2. Message forwarding
3. Group chats
4. Voice messages
5. Image/file sharing
6. Message search
7. Chat archiving
8. Mute notifications

