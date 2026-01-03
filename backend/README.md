# Campus Collab Backend

Backend API for Campus Collab - A college collaboration platform.

## Features

- JWT-based authentication with role-based access control
- Real-time chat with Socket.io
- AI-based abusive content detection
- Project recommendations based on user profile
- Comprehensive admin dashboard
- Complete CRUD operations for all modules

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file in the backend directory:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campus-collab
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
FACULTY_REGISTRATION_CODE=FACULTY2024SECRET
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Note:** To use AI summarization feature, you need to:
1. Get a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file as `GOOGLE_GEMINI_API_KEY`

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Projects
- `GET /api/projects` - Get all projects (with filtering)
- `POST /api/projects` - Create a new project (Student only)
- `POST /api/projects/:id/like` - Like/Unlike a project
- `POST /api/projects/:id/comment` - Add comment to project
- `POST /api/projects/:id/join` - Join a project
- `PUT /api/projects/:id/close` - Close a project (Owner only)

### Internships
- `GET /api/internships` - Get all internships
- `POST /api/internships` - Create internship (Faculty only)
- `POST /api/internships/:id/like` - Like internship (adds to reminders)
- `DELETE /api/internships/:id` - Delete internship

### Hackathons
- `GET /api/hackathons` - Get all hackathons
- `POST /api/hackathons` - Create hackathon
- `POST /api/hackathons/:id/like` - Like hackathon
- `DELETE /api/hackathons/:id` - Delete hackathon

### Drives
- `GET /api/drives` - Get all placement drives
- `POST /api/drives` - Create drive (Faculty only)
- `POST /api/drives/:id/like` - Like drive
- `DELETE /api/drives/:id` - Delete drive

### Course Links
- `GET /api/course-links` - Get all course links
- `POST /api/course-links` - Create course link (Faculty only)
- `DELETE /api/course-links/:id` - Delete course link

### Reminders
- `GET /api/reminders` - Get user's reminders
- `DELETE /api/reminders/:id` - Delete reminder

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations
- `POST /api/recommendations/refresh` - Refresh recommendations

### Chats
- `GET /api/chats` - Get all user's chats
- `GET /api/chats/:userId` - Get/Create chat with specific user
- `POST /api/chats/:chatId/message` - Send message

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/suspend` - Suspend/Unsuspend user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/reports` - Get all reports
- `PUT /api/admin/reports/:id/review` - Review a report
- `DELETE /api/admin/projects/:id` - Delete any project
- `PUT /api/admin/projects/:id/disable-comments` - Disable/Enable comments

## Database Models

- **User** - User accounts with role-based access
- **Project** - Student project ideas
- **Internship** - Internship opportunities
- **Hackathon** - Hackathon information
- **Drive** - Placement drives
- **CourseLink** - Learning resources
- **Reminder** - Saved items
- **Chat** - Personal messages
- **Report** - Flagged content
- **Recommendation** - AI-based recommendations

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Socket.io for real-time chat
- bcryptjs for password hashing

