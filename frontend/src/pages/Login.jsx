import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { authAPI } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, X, KeyRound, CheckCircle } from 'lucide-react';
import cclogo from '../assets/cclogo.png';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPasswordField, setShowResetPasswordField] = useState(false);
  const [showConfirmResetPasswordField, setShowConfirmResetPasswordField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOTP, setResetOTP] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login, isAuthenticated } = useAuth();
  const { addNotification } = useGlobal();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage('');
  };

  // Validate email domain
  const validateEmailDomain = (email) => {
    return email.toLowerCase().endsWith('@mvgrce.edu.in');
  };

  // Handle forgot password - Send OTP
  const handleSendResetOTP = async (e) => {
    e.preventDefault();

    if (!forgotEmail) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter your email address',
      });
      return;
    }

    /* 
    // Validation removed to let backend handle checks
    if (!validateEmailDomain(forgotEmail)) {
      addNotification({
        type: 'error',
        title: 'Invalid Email Domain',
        message: 'Only college mails (@mvgrce.edu.in) are accepted',
      });
      return;
    } 
    */

    setSendingOTP(true);
    try {
      await authAPI.forgotPassword(forgotEmail);
      setOtpSent(true);
      addNotification({
        type: 'success',
        title: 'OTP Sent',
        message: 'Password reset OTP has been sent to your email',
      });
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Could not send OTP. Please try again.';
      addNotification({
        type: 'error',
        title: 'Failed to Send OTP',
        message: msg,
      });
    } finally {
      setSendingOTP(false);
    }
  };

  // Handle verify reset OTP
  const handleVerifyResetOTP = async (e) => {
    e.preventDefault();

    if (!resetOTP || resetOTP.length !== 6) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid 6-digit OTP',
      });
      return;
    }

    setVerifyingOTP(true);
    try {
      await authAPI.verifyResetOTP(forgotEmail, resetOTP);
      setOtpVerified(true);
      setShowResetPassword(true);
      addNotification({
        type: 'success',
        title: 'OTP Verified',
        message: 'Please enter your new password',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'OTP Verification Failed',
        message: error.response?.data?.message || error.message || 'Invalid OTP. Please try again.',
      });
      setResetOTP('');
    } finally {
      setVerifyingOTP(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!resetPassword || resetPassword.length < 6) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    if (resetPassword !== confirmResetPassword) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Passwords do not match',
      });
      return;
    }

    setResettingPassword(true);
    try {
      const response = await authAPI.resetPassword(forgotEmail, resetOTP, resetPassword);

      // Automatically log in the user with the returned token and user data
      if (response.token && response.user) {
        login(response.user, response.token);
        addNotification({
          type: 'success',
          title: 'Password Reset Successful',
          message: 'Your password has been reset. You have been automatically logged in.',
        });

        // Close modal and reset state
        setShowForgotPassword(false);
        setForgotEmail('');
        setResetOTP('');
        setResetPassword('');
        setConfirmResetPassword('');
        setOtpSent(false);
        setOtpVerified(false);
        setShowResetPassword(false);

        // Navigate to home page
        navigate('/');
      } else {
        // Fallback if token/user not returned (shouldn't happen with updated backend)
        addNotification({
          type: 'success',
          title: 'Password Reset Successful',
          message: 'Your password has been reset. Please login with your new password.',
        });
        setShowForgotPassword(false);
        setForgotEmail('');
        setResetOTP('');
        setResetPassword('');
        setConfirmResetPassword('');
        setOtpSent(false);
        setOtpVerified(false);
        setShowResetPassword(false);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Password Reset Failed',
        message: error.response?.data?.message || error.message || 'Failed to reset password. Please try again.',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await authAPI.login(formData);
      login(response.user, response.token);
      addNotification({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back, ${response.user.name}!`,
      });
      navigate('/');
    } catch (error) {
      // Show specific error from backend (e.g., "User not found" or "Invalid credentials")
      setErrorMessage(error.response?.data?.message || error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100 pt-16 pb-12 px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-300/20 rounded-full blur-2xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-md w-full"
      >
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img
                src={cclogo}
                alt="Campus Collab Logo"
                className="h-10 w-auto object-contain select-none"
                draggable="false"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
                Campus Collab
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-amber-600" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                  placeholder="your.email@mvgrce.edu.in"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    // Pre-fill email from login form if available
                    if (formData.email) {
                      setForgotEmail(formData.email);
                    }
                    setShowForgotPassword(true);
                  }}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-600 text-sm text-center overflow-hidden mb-4 font-medium"
                >
                  <p>{errorMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white py-3 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-amber-600 hover:text-amber-700 font-semibold transition-colors flex items-center justify-center space-x-1 group"
              >
                <span>Create one here</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl"></div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowForgotPassword(false);
                setForgotEmail('');
                setResetOTP('');
                setResetPassword('');
                setConfirmResetPassword('');
                setOtpSent(false);
                setOtpVerified(false);
                setShowResetPassword(false);
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full relative">
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail('');
                    setResetOTP('');
                    setResetPassword('');
                    setConfirmResetPassword('');
                    setOtpSent(false);
                    setOtpVerified(false);
                    setShowResetPassword(false);
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
                  <p className="text-gray-600 text-sm">Enter your college email to receive a password reset OTP</p>
                </div>

                {!otpSent ? (
                  <form onSubmit={handleSendResetOTP} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <Mail className="h-5 w-5 text-amber-600" />
                        </div>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && forgotEmail && validateEmailDomain(forgotEmail) && !sendingOTP) {
                              e.preventDefault();
                              handleSendResetOTP(e);
                            }
                          }}
                          required
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm ${forgotEmail && !validateEmailDomain(forgotEmail)
                            ? 'border-red-300 focus:ring-red-500'
                            : forgotEmail && validateEmailDomain(forgotEmail)
                              ? 'border-green-300 focus:ring-green-500'
                              : 'border-amber-200/50'
                            }`}
                          placeholder="your.email@mvgrce.edu.in"
                        />
                      </div>
                      {forgotEmail && !validateEmailDomain(forgotEmail) && (
                        <p className="text-red-500 text-xs mt-1">Only college mails are accepted</p>
                      )}
                      {forgotEmail && validateEmailDomain(forgotEmail) && (
                        <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                          <CheckCircle size={12} /> Valid email domain
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={sendingOTP || !forgotEmail || !validateEmailDomain(forgotEmail)}
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white py-3 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {sendingOTP ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <Mail size={18} />
                          <span>Send Reset OTP</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : !otpVerified ? (
                  <form onSubmit={handleVerifyResetOTP} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Enter Verification Code
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <KeyRound className="h-5 w-5 text-amber-600" />
                        </div>
                        <input
                          type="text"
                          value={resetOTP}
                          onChange={(e) => setResetOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && resetOTP.length === 6 && !verifyingOTP) {
                              e.preventDefault();
                              handleVerifyResetOTP(e);
                            }
                          }}
                          maxLength={6}
                          placeholder="000000"
                          className="w-full pl-10 pr-4 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm text-center text-2xl font-bold tracking-widest"
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1">Enter the 6-digit code sent to your email</p>
                    </div>
                    <button
                      type="submit"
                      disabled={verifyingOTP || resetOTP.length !== 6}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {verifyingOTP ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          <span>Verify OTP</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setResetOTP('');
                      }}
                      className="w-full text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
                    >
                      Back to email
                    </button>
                  </form>
                ) : showResetPassword ? (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <Lock className="h-5 w-5 text-amber-600" />
                        </div>
                        <input
                          type={showResetPasswordField ? 'text' : 'password'}
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full pl-10 pr-12 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPasswordField(!showResetPasswordField)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showResetPasswordField ? (
                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <Lock className="h-5 w-5 text-amber-600" />
                        </div>
                        <input
                          type={showConfirmResetPasswordField ? 'text' : 'password'}
                          value={confirmResetPassword}
                          onChange={(e) => setConfirmResetPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full pl-10 pr-12 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmResetPasswordField(!showConfirmResetPasswordField)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showConfirmResetPasswordField ? (
                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                      {confirmResetPassword && resetPassword !== confirmResetPassword && (
                        <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={resettingPassword || !resetPassword || resetPassword !== confirmResetPassword}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {resettingPassword ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          <span>Resetting Password...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          <span>Reset Password</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;