import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GlobalProvider } from './context/GlobalContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Notification from './components/Notification';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import Internships from './pages/Internships';
import Hackathons from './pages/Hackathons';
import Drives from './pages/Drives';
import CourseLinks from './pages/CourseLinks';
import Reminders from './pages/Reminders';
import Recommendations from './pages/Recommendations';
import AdminDashboard from './pages/AdminDashboard';
import Chats from './pages/Chats';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <GlobalProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Navbar />
            <Notification />
            <main className="relative">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id"
                  element={
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/internships"
                  element={
                    <ProtectedRoute>
                      <Internships />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/internships/:id"
                  element={
                    <ProtectedRoute>
                      <Internships />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/hackathons"
                  element={
                    <ProtectedRoute>
                      <Hackathons />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/hackathons/:id"
                  element={
                    <ProtectedRoute>
                      <Hackathons />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/drives"
                  element={
                    <ProtectedRoute>
                      <Drives />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/drives/:id"
                  element={
                    <ProtectedRoute>
                      <Drives />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses"
                  element={
                    <ProtectedRoute>
                      <CourseLinks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/:id"
                  element={
                    <ProtectedRoute>
                      <CourseLinks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reminders"
                  element={
                    <ProtectedRoute>
                      <Reminders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recommendations"
                  element={
                    <ProtectedRoute roles={['student']}>
                      <Recommendations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chats"
                  element={
                    <ProtectedRoute>
                      <Chats />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chats/:chatId"
                  element={
                    <ProtectedRoute>
                      <Chats />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </GlobalProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;