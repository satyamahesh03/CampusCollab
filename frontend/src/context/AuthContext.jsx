import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const userData = JSON.parse(localStorage.getItem('user'));
          setUser(userData);
        } catch (error) {
          console.error('Error loading user:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = (userData, tokenValue) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokenValue}`;
    setToken(tokenValue);
    setUser(userData);
  };

  const register = (userData, tokenValue) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokenValue}`;
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    setUser,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
    isStudent: user?.role === 'student',
    isFaculty: user?.role === 'faculty',
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

