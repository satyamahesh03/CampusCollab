# Campus Collab Frontend

Frontend application for Campus Collab built with React + Vite.

## Features

- React 18 with Vite for fast development
- Tailwind CSS for styling
- Framer Motion for animations
- Context API for state management
- Socket.io for real-time chat
- Responsive design
- Role-based access control

## Prerequisites

- Node.js (v14 or higher)
- Backend server running on port 5000

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update environment variables if needed:
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Running the Application

### Development Mode
```bash
npm run dev
```

The application will start on `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure

```
src/
├── components/         # Reusable components
├── context/           # Context API providers
├── pages/             # Page components
├── utils/             # Utility functions and API calls
├── App.jsx            # Main app component with routing
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## Available Pages

- **Home** - Landing page
- **Login/Register** - Authentication
- **Projects** - Browse and create projects
- **Internships** - View internship opportunities
- **Hackathons** - Browse hackathons
- **Drives** - View placement drives
- **Course Links** - Access learning resources
- **Reminders** - Saved items
- **Recommendations** - AI-powered project recommendations (Students)
- **Chats** - Real-time messaging
- **Admin Dashboard** - Admin panel (Admin only)
- **Profile** - User profile

## Technologies Used

- React 18
- Vite
- React Router v6
- Tailwind CSS
- Framer Motion
- Axios
- Socket.io Client
- React Icons
- date-fns

