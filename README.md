# Campus Collab

A full-stack MERN application for college-level collaboration across all departments. Campus Collab connects students and faculty for projects, internships, hackathons, and placement drives — providing a unified space for academic and innovation-based interaction.

## 🚀 Features

### Core Modules

1. **Projects Section**
   - Students can post project ideas with required roles and domains
   - Join conversations and collaborate with other students
   - Like, comment, and track project progress
   - Close projects when all roles are filled
   - Trending projects based on engagement

2. **Internships Section**
   - Faculty can post internship opportunities
   - Students can view, filter, and like internships
   - Liked internships automatically saved to reminders
   - Filter by domain, department, and year

3. **Hackathons Section**
   - Faculty and students can post hackathon details
   - Like hackathons to save in reminders
   - Trending hackathons highlighted
   - Filter by domain, department, and year

4. **Placement Drives Section**
   - Faculty can post placement drive details
   - Students can view and save to reminders
   - Filter by department and year

5. **Course Links Section**
   - Faculty can share learning materials and resources
   - Categorized by department and subject
   - Easy access to educational content

6. **AI Recommendations** (Students)
   - Personalized project recommendations
   - Based on user skills, liked domains, and participation history
   - ML-based scoring system

### Additional Features

- **Role-Based Authentication**
  - Student, Faculty, and Admin roles
  - Faculty registration requires unique validation code
  - JWT-based secure authentication

- **Real-Time Chat**
  - 1-to-1 messaging between users
  - Socket.io powered real-time communication
  - Message history and typing indicators

- **Abusive Content Detection**
  - AI-powered comment and message filtering
  - Automatic flagging and reporting
  - Comments disabled on flagged posts
  - Admin review system

- **Reminders System**
  - Save internships, hackathons, and drives
  - Quick access to important opportunities
  - One-click reminder management

- **Admin Dashboard**
  - User management (suspend/activate users)
  - Content moderation
  - Report review and action
  - System-wide analytics
  - Trending content monitoring

## 🛠 Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** (localhost) with Mongoose
- **JWT** for authentication
- **Socket.io** for real-time chat
- **bcryptjs** for password hashing
- Role-based access control middleware

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Context API** for state management
- **Axios** for API calls
- **Socket.io Client** for real-time features
- **React Router** for navigation
- **React Icons** for UI icons

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
cd /Users/satyamahesh/Full\ Stack/CampusCollab
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your configuration
# MONGODB_URI=mongodb://localhost:27017/campus-collab
# JWT_SECRET=your_secret_key
# FACULTY_REGISTRATION_CODE=your_faculty_code

# Start MongoDB (if not running)
# mongod

# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
# Open new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start frontend development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📱 Usage

### First Time Setup

1. **Start MongoDB** on your local machine
2. **Start Backend Server**: `cd backend && npm run dev`
3. **Start Frontend**: `cd frontend && npm run dev`
4. **Access Application**: Open browser to `http://localhost:5173`

### User Registration

**Student Registration:**
- Click "Register"
- Fill in details with role "Student"
- Select department and year
- Create account

**Faculty Registration:**
- Click "Register"
- Fill in details with role "Faculty"
- Enter faculty registration code (from .env file)
- Create account

**Admin Account:**
- Create a user account
- Manually update role in MongoDB to "admin"

### Key Workflows

**For Students:**
1. Browse projects, internships, hackathons, and drives
2. Create project ideas and find collaborators
3. Like content to save in reminders
4. Get AI-powered project recommendations
5. Chat with other students and faculty

**For Faculty:**
1. Post internships, hackathons, and placement drives
2. Share course links and learning resources
3. Monitor student projects
4. Communicate with students

**For Admins:**
1. Access admin dashboard
2. Review flagged content and reports
3. Suspend/activate user accounts
4. Monitor system analytics
5. Moderate all content

## 🗂 Project Structure

```
CampusCollab/
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/      # Auth, error handling, content moderation
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── server.js        # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # Context providers
│   │   ├── pages/       # Page components
│   │   ├── utils/       # Helpers and API
│   │   ├── App.jsx      # Main app
│   │   └── main.jsx     # Entry point
│   ├── public/
│   └── package.json
│
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project (Student)
- `POST /api/projects/:id/like` - Like project
- `POST /api/projects/:id/comment` - Add comment
- `POST /api/projects/:id/join` - Join project

### Internships, Hackathons, Drives
- Similar CRUD operations with role-based access

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - All users
- `PUT /api/admin/users/:id/suspend` - Suspend user
- `GET /api/admin/reports` - View reports

## 🎨 Features in Detail

### AI/ML Integration Points

1. **Abusive Content Detection**
   - Keyword-based detection (placeholder for ML model)
   - Automatic reporting system
   - Admin review workflow

2. **Project Recommendations**
   - Skill-based matching
   - Domain preference analysis
   - Engagement scoring
   - Personalized suggestions

### Real-Time Features

- Live chat with Socket.io
- Typing indicators
- Instant message delivery
- Online/offline status

### Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Faculty code validation
- Protected API routes

## 🤝 Contributing

This is a college project. For any improvements or suggestions:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campus-collab
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
FACULTY_REGISTRATION_CODE=FACULTY2024SECRET
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running: `mongod`
- Check connection string in .env

**Port Already in Use:**
- Backend: Change PORT in backend/.env
- Frontend: Change port in frontend/vite.config.js

**CORS Errors:**
- Ensure backend is running
- Check CORS configuration in server.js

## 📄 License

This project is created for educational purposes.

## 👥 Authors

Created as part of Full Stack Development coursework.

## 🙏 Acknowledgments

- React team for excellent documentation
- MongoDB for the database solution
- All open-source contributors

---

**Happy Collaborating! 🎓**

