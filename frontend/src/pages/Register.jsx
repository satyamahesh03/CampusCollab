import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGlobal } from '../context/GlobalContext';
import { authAPI } from '../utils/api';
import { departments, years } from '../utils/helpers';
import { motion } from 'framer-motion';
import cclogo from '../assets/cclogo.png';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  GraduationCap,
  Shield,
  CheckCircle,
  KeyRound,
  ArrowLeft
} from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
    year: '',
    facultyCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const { register } = useAuth();
  const { addNotification } = useGlobal();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Reset OTP verification if email changes
    if (name === 'email' && otpSent) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtp('');
    }
  };

  // Validate email domain
  const validateEmailDomain = (email) => {
    return email.toLowerCase().endsWith('@mvgrce.edu.in');
  };

  // Handle sending OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter your email address',
      });
      return;
    }

    if (!validateEmailDomain(formData.email)) {
      addNotification({
        type: 'error',
        title: 'Invalid Email Domain',
        message: 'Only college mails are accepted',
      });
      return;
    }

    setSendingOTP(true);
    try {
      await authAPI.sendOTP(formData.email);
      setOtpSent(true);
      setOtpResendTimer(60); // 60 seconds cooldown
      addNotification({
        type: 'success',
        title: 'OTP Sent',
        message: 'Please check your email for the verification code',
      });
      
      // Start countdown timer
      const timer = setInterval(() => {
        setOtpResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to Send OTP',
        message: error.message || 'Could not send OTP. Please try again.',
      });
    } finally {
      setSendingOTP(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid 6-digit OTP',
      });
      return;
    }

    setVerifyingOTP(true);
    try {
      await authAPI.verifyOTP(formData.email, otp);
      setOtpVerified(true);
      addNotification({
        type: 'success',
        title: 'Email Verified',
        message: 'Your email has been verified. You can now complete registration.',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'OTP Verification Failed',
        message: error.message || 'Invalid OTP. Please try again.',
      });
      setOtp('');
    } finally {
      setVerifyingOTP(false);
    }
  };

  // Handle final registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!otpVerified) {
      addNotification({
        type: 'error',
        title: 'Email Not Verified',
        message: 'Please verify your email with OTP first',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Passwords do not match',
      });
      return;
    }

    if (formData.password.length < 6) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      register(response.user, response.token);
      addNotification({
        type: 'success',
        title: 'Registration Successful',
        message: `Welcome to Campus Collab, ${response.user.name}!`,
      });
      navigate('/');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: error.message || 'An error occurred during registration',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100 pt-24 pb-12 px-4 relative overflow-hidden">
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
        className="relative z-10 max-w-2xl w-full"
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600">Join our community of students and faculty</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email - Always visible for OTP verification */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !otpSent && formData.email && validateEmailDomain(formData.email) && !sendingOTP) {
                        e.preventDefault();
                        handleSendOTP(e);
                      }
                    }}
                    required
                    disabled={otpSent}
                    className={`w-full pl-10 pr-4 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm ${
                      formData.email && !validateEmailDomain(formData.email) 
                        ? 'border-red-300 focus:ring-red-500' 
                        : formData.email && validateEmailDomain(formData.email)
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-200'
                    } ${otpSent ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="your.email@mvgrce.edu.in"
                  />
                </div>
                {formData.email && !validateEmailDomain(formData.email) && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    Only college mails are accepted
                  </p>
                )}
                {formData.email && validateEmailDomain(formData.email) && !otpSent && (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                    <CheckCircle size={12} /> Valid email domain
                  </p>
                )}
                {otpSent && (
                  <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                    <CheckCircle size={12} /> OTP sent to your email
                  </p>
                )}
              </div>

              {/* Send OTP Button - Always visible, disabled until valid email domain */}
              {!otpSent && (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={sendingOTP || !formData.email || !validateEmailDomain(formData.email)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingOTP ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        <span>Send Verification OTP</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* OTP Input - Show after OTP is sent */}
              {otpSent && !otpVerified && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enter Verification Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <KeyRound className="h-5 w-5 text-amber-600" />
                      </div>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && otp.length === 6 && !verifyingOTP) {
                            e.preventDefault();
                            handleVerifyOTP(e);
                          }
                        }}
                        maxLength={6}
                        placeholder="000000"
                        className="w-full pl-10 pr-4 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm text-center text-2xl font-bold tracking-widest"
                      />
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Enter the 6-digit code sent to your email</p>
                  </div>

                  <div className="md:col-span-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handleVerifyOTP}
                      disabled={verifyingOTP || otp.length !== 6}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                        setOtp('');
                        setOtpVerified(false);
                      }}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  </div>

                  {/* Resend OTP */}
                  {otpResendTimer > 0 ? (
                    <div className="md:col-span-2 text-center">
                      <p className="text-sm text-gray-500">
                        Resend OTP in {otpResendTimer} seconds
                      </p>
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={sendingOTP}
                        className="w-full text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors disabled:opacity-50"
                      >
                        {sendingOTP ? 'Sending...' : 'Resend OTP'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Show success message when OTP is verified */}
              {otpVerified && (
                <div className="md:col-span-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-700 text-sm flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    Email verified! You can now complete your registration.
                  </p>
                </div>
              )}

              {/* Registration Fields - Only show after OTP verification */}
              {otpVerified && (
                <>
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <User className="h-5 w-5 text-amber-600" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    {formData.role === 'student' ? (
                      <GraduationCap className="h-5 w-5 text-amber-600" />
                    ) : (
                      <Shield className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-gray-50/50 appearance-none"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year (for students) */}
              {formData.role === 'student' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Year of Study
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                  >
                    <option value="">Select Year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Faculty Code */}
              {formData.role === 'faculty' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Faculty Code
                  </label>
                  <input
                    type="text"
                    name="facultyCode"
                    value={formData.facultyCode}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                    placeholder="Enter faculty registration code"
                  />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
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

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-amber-600" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-amber-200/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200 bg-white/60 backdrop-blur-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
                </>
              )}
            </div>

            {/* Submit Button - Only show after OTP verification */}
            {otpVerified && (
              <motion.button
                type="submit"
                disabled={loading || !otpVerified}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white py-3 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </motion.button>
            )}
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-amber-600 hover:text-amber-700 font-semibold transition-colors flex items-center justify-center space-x-1 group"
              >
                <span>Sign in here</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl"></div>
      </motion.div>
    </div>
  );
};

export default Register;