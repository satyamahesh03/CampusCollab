import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM dd, yyyy hh:mm a');
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Format date for chat messages (like WhatsApp)
export const formatChatDate = (date) => {
  if (!date) return '';
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time to compare dates only
  const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (messageDateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    // Check if it's within the current year
    if (messageDate.getFullYear() === today.getFullYear()) {
      return format(messageDate, 'MMMM d');
    } else {
      return format(messageDate, 'MMMM d, yyyy');
    }
  }
};

// Check if two dates are on different days
export const isDifferentDay = (date1, date2) => {
  if (!date1 || !date2) return true;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
};

export const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getDomainColor = (domain) => {
  const colors = {
    'Web Development': 'bg-blue-100 text-blue-800',
    'Mobile Development': 'bg-green-100 text-green-800',
    'AI/ML': 'bg-purple-100 text-purple-800',
    'Data Science': 'bg-pink-100 text-pink-800',
    'Blockchain': 'bg-yellow-100 text-yellow-800',
    'IoT': 'bg-indigo-100 text-indigo-800',
    'Cybersecurity': 'bg-red-100 text-red-800',
    'Cloud Computing': 'bg-teal-100 text-teal-800',
    'DevOps': 'bg-orange-100 text-orange-800',
    'UI/UX': 'bg-cyan-100 text-cyan-800',
  };
  return colors[domain] || 'bg-gray-100 text-gray-800';
};

export const getRoleColor = (role) => {
  const colors = {
    student: 'bg-blue-100 text-blue-800',
    faculty: 'bg-green-100 text-green-800',
    admin: 'bg-red-100 text-red-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
};

export const getStatusColor = (status) => {
  const colors = {
    open: 'bg-green-100 text-green-800',
    closed: 'bg-red-100 text-red-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    reviewed: 'bg-blue-100 text-blue-800',
    'action-taken': 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const departments = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Electrical',
  'Mechanical',
  'Civil',
  'Chemical',
  'Biotechnology',
  'Other',
];

export const domains = [
  'Web Development',
  'Mobile Development',
  'AI/ML',
  'Data Science',
  'Blockchain',
  'IoT',
  'Cybersecurity',
  'Cloud Computing',
  'DevOps',
  'UI/UX',
  'Game Development',
  'Other',
];

export const years = [1, 2, 3, 4];

export const skills = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C',
  'C++',
  'C#',
  'Go',
  'Rust',
  'PHP',
  'Ruby',
  'SQL',
  'NoSQL',
  'HTML',
  'CSS',
  'React',
  'Angular',
  'Vue',
  'Next.js',
  'Node.js',
  'Express',
  'Django',
  'Flask',
  'FastAPI',
  'Spring',
  'Laravel',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'SQLite',
  'Firebase',
  'AWS',
  'GCP',
  'Azure',
  'Docker',
  'Kubernetes',
  'CI/CD',
  'Git',
  'REST APIs',
  'GraphQL',
  'Microservices',
  'TensorFlow',
  'PyTorch',
  'Scikit-learn',
  'Pandas',
  'NumPy',
  'Matplotlib',
  'Data Visualization',
  'Machine Learning',
  'Deep Learning',
  'NLP',
  'Computer Vision',
  'MLOps',
  'Data Engineering',
  'Big Data',
  'Hadoop',
  'Spark',
  'Tableau',
  'Power BI',
  'Figma',
  'UI/UX Design',
  'Wireframing',
  'Prototyping',
  'Accessibility',
  'Cybersecurity',
  'Penetration Testing',
  'Network Security',
  'Cloud Security',
  'DevOps',
  'Embedded Systems',
  'IoT',
  'Robotics',
  'Arduino',
  'Raspberry Pi',
  'Blockchain',
  'Smart Contracts',
  'Solidity',
  'Web3',
  'Testing',
  'Jest',
  'Cypress',
  'Playwright',
  'QA Automation',
  'Agile',
  'Scrum',
  'Project Management',
  'Technical Writing'
];

