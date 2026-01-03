import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:6500/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  sendOTP: (email) => api.post('/auth/send-otp', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  getUserProfile: (userId) => api.get(`/auth/user/${userId}`),
  updateProfile: (data) => api.put('/auth/profile', data),
  blockUser: (userId) => api.post(`/auth/block/${userId}`),
  unblockUser: (userId) => api.post(`/auth/unblock/${userId}`),
  getBlockedUsers: () => api.get('/auth/blocked-users'),
};

// Project APIs
export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  getByUser: (userId) => api.get(`/projects/by-user/${userId}`),
  create: (data) => api.post('/projects', data),
  like: (id) => api.post(`/projects/${id}/like`),
  comment: (id, data) => api.post(`/projects/${id}/comment`, data),
  addComment: (id, data) => api.post(`/projects/${id}/comment`, data),
  addReply: (projectId, commentId, data, parentReplyId = null) => api.post(`/projects/${projectId}/comment/${commentId}/reply`, { ...data, parentReplyId }),
  voteComment: (projectId, commentId, voteType) => api.post(`/projects/${projectId}/comment/${commentId}/vote`, { voteType }),
  voteReply: (projectId, commentId, replyId, voteType) => api.post(`/projects/${projectId}/comment/${commentId}/reply/${replyId}/vote`, { voteType }),
  deleteComment: (projectId, commentId) => api.delete(`/projects/${projectId}/comment/${commentId}`),
  deleteReply: (projectId, commentId, replyId) => api.delete(`/projects/${projectId}/comment/${commentId}/reply/${replyId}`),
  join: (id, data) => api.post(`/projects/${id}/join`, data),
  approveRequest: (projectId, requestId) => api.post(`/projects/${projectId}/approve-request/${requestId}`),
  rejectRequest: (projectId, requestId) => api.post(`/projects/${projectId}/reject-request/${requestId}`),
  close: (id) => api.put(`/projects/${id}/close`),
  delete: (id) => api.delete(`/projects/${id}`),
  summarize: (id) => api.post(`/projects/${id}/summarize`),
};

// Internship APIs
export const internshipAPI = {
  getAll: (params) => api.get('/internships', { params }),
  getById: (id) => api.get(`/internships/${id}`),
  create: (data) => api.post('/internships', data),
  like: (id) => api.post(`/internships/${id}/like`),
  delete: (id) => api.delete(`/internships/${id}`),
};

// Hackathon APIs
export const hackathonAPI = {
  getAll: (params) => api.get('/hackathons', { params }),
  getById: (id) => api.get(`/hackathons/${id}`),
  create: (data) => api.post('/hackathons', data),
  like: (id) => api.post(`/hackathons/${id}/like`),
  delete: (id) => api.delete(`/hackathons/${id}`),
};

// Drive APIs
export const driveAPI = {
  getAll: (params) => api.get('/drives', { params }),
  getById: (id) => api.get(`/drives/${id}`),
  create: (data) => api.post('/drives', data),
  like: (id) => api.post(`/drives/${id}/like`),
  delete: (id) => api.delete(`/drives/${id}`),
};

// Course Link APIs
export const courseLinkAPI = {
  getAll: (params) => api.get('/course-links', { params }),
  getById: (id) => api.get(`/course-links/${id}`),
  create: (data) => api.post('/course-links', data),
  fetchMetadata: (url) => api.post('/course-links/fetch-metadata', { url }),
  delete: (id) => api.delete(`/course-links/${id}`),
};

// Reminder APIs
export const reminderAPI = {
  getAll: () => api.get('/reminders'),
  delete: (id) => api.delete(`/reminders/${id}`),
};

// Notification APIs
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Recommendation APIs
export const recommendationAPI = {
  get: () => api.get('/recommendations'),
  refresh: () => api.post('/recommendations/refresh'),
};

// Chat APIs
export const chatAPI = {
  getAll: () => api.get('/chats'), // Get approved chats only
  getRequests: () => api.get('/chats/requests'), // Get pending message requests
  getChat: (userId) => api.get(`/chats/${userId}`),
  getChatByCode: (chatCode) => api.get(`/chats/code/${chatCode}`),
  sendMessage: (chatId, data) => api.post(`/chats/${chatId}/message`, data),
  markAsRead: (chatId) => api.put(`/chats/${chatId}/mark-read`),
  deleteMessage: (chatId, messageId) => api.delete(`/chats/${chatId}/message/${messageId}`),
  deleteChat: (chatId) => api.delete(`/chats/${chatId}`),
  approveDeleteRequest: (chatId) => api.put(`/chats/${chatId}/delete-approve`),
  declineDeleteRequest: (chatId) => api.put(`/chats/${chatId}/delete-decline`),
  searchUsers: (query) => api.get('/chats/users/search', { params: { query } }),
  approveChat: (chatId) => api.put(`/chats/${chatId}/approve`),
  rejectChat: (chatId) => api.put(`/chats/${chatId}/reject`),
};

// Stats APIs
export const statsAPI = {
  getPublicStats: (period) => api.get('/stats/public', { params: { period } }),
};

// Admin APIs
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (id, data) => api.put(`/admin/users/${id}/suspend`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getReports: (params) => api.get('/admin/reports', { params }),
  reviewReport: (id, data) => api.put(`/admin/reports/${id}/review`, data),
  deleteProject: (id) => api.delete(`/admin/projects/${id}`),
  deleteInternship: (id) => api.delete(`/admin/internships/${id}`),
  deleteHackathon: (id) => api.delete(`/admin/hackathons/${id}`),
  deleteDrive: (id) => api.delete(`/admin/drives/${id}`),
  deleteCourseLink: (id) => api.delete(`/admin/course-links/${id}`),
  toggleComments: (id) => api.put(`/admin/projects/${id}/disable-comments`),
  hideProject: (id) => api.put(`/admin/projects/${id}/hide`),
  hideInternship: (id) => api.put(`/admin/internships/${id}/hide`),
  hideHackathon: (id) => api.put(`/admin/hackathons/${id}/hide`),
  hideDrive: (id) => api.put(`/admin/drives/${id}/hide`),
  hideCourseLink: (id) => api.put(`/admin/course-links/${id}/hide`),
  // Admin-specific content fetching (includes hidden posts)
  getProjects: (params) => api.get('/admin/content/projects', { params }),
  getInternships: (params) => api.get('/admin/content/internships', { params }),
  getHackathons: (params) => api.get('/admin/content/hackathons', { params }),
  getDrives: (params) => api.get('/admin/content/drives', { params }),
  getCourseLinks: (params) => api.get('/admin/content/course-links', { params }),
};

export default api;

