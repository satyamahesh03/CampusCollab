// Skill progression mapping - defines what skills come next after a given skill
// This is used for intelligent course recommendations

// Skill progression mapping - keys are normalized to lowercase
const skillMapping = {
  // Web Development progression
  'html': ['CSS', 'HTML5'],
  'html5': ['CSS', 'JavaScript'],
  'css': ['JavaScript', 'SASS', 'SCSS'],
  'sass': ['JavaScript', 'React'],
  'scss': ['JavaScript', 'React'],
  'javascript': ['React', 'Node.js', 'TypeScript', 'Vue', 'Angular'],
  'typescript': ['React', 'Node.js', 'Angular'],
  
  // Frontend Frameworks
  'react': ['Next.js', 'React Native', 'Redux', 'GraphQL'],
  'vue': ['Nuxt.js', 'Vuex', 'Pinia'],
  'angular': ['RxJS', 'NgRx'],
  'next.js': ['React Native', 'Full Stack Development'],
  'nextjs': ['React Native', 'Full Stack Development'],
  
  // Backend progression
  'node.js': ['Express', 'REST APIs', 'GraphQL', 'MongoDB'],
  'nodejs': ['Express', 'REST APIs', 'GraphQL', 'MongoDB'],
  'express': ['REST APIs', 'GraphQL', 'Microservices', 'WebSocket'],
  'rest APIs': ['GraphQL', 'Microservices'],
  'graphql': ['Apollo', 'Microservices'],
  
  // Python progression
  'python': ['Data Structures', 'Machine Learning', 'Django', 'Flask'],
  'django': ['REST APIs', 'PostgreSQL', 'Docker'],
  'flask': ['REST APIs', 'PostgreSQL', 'Docker'],
  'fastapi': ['REST APIs', 'PostgreSQL', 'Docker'],
  
  // Machine Learning progression
  'machine learning': ['Deep Learning', 'TensorFlow', 'PyTorch'],
  'deep learning': ['Computer Vision', 'NLP', 'TensorFlow', 'PyTorch'],
  'tensorflow': ['MLOps', 'Deep Learning', 'Keras'],
  'pytorch': ['MLOps', 'Deep Learning'],
  'scikit-learn': ['Machine Learning', 'Data Science'],
  'pandas': ['Data Science', 'NumPy', 'Data Visualization'],
  'numpy': ['Data Science', 'Pandas', 'Data Visualization'],
  
  // Java progression
  'java': ['Spring', 'Hibernate', 'Spring Boot'],
  'spring': ['Spring Boot', 'Microservices', 'JPA'],
  'spring boot': ['Microservices', 'Docker', 'Kubernetes'],
  'hibernate': ['JPA', 'Database Design'],
  
  // Database progression
  'sql': ['Database Design', 'MySQL', 'PostgreSQL', 'MongoDB'],
  'mysql': ['Database Design', 'PostgreSQL', 'Performance Tuning'],
  'postgresql': ['Database Design', 'Performance Tuning'],
  'mongodb': ['NoSQL', 'Database Design', 'Express'],
  'nosql': ['MongoDB', 'Database Design'],
  
  // C/C++ progression
  'c': ['Data Structures', 'C++', 'Algorithms'],
  'c++': ['Data Structures', 'Algorithms', 'Competitive Programming'],
  
  // Data Structures & Algorithms
  'data structures': ['Algorithms', 'Competitive Programming'],
  'algorithms': ['Competitive Programming', 'System Design'],
  'competitive programming': ['System Design', 'Problem Solving'],
  
  // Cloud & DevOps progression
  'aws': ['DevOps', 'Kubernetes', 'Docker', 'CI/CD'],
  'docker': ['Kubernetes', 'CI/CD', 'DevOps'],
  'kubernetes': ['CI/CD', 'DevOps', 'Cloud Architecture'],
  'devops': ['CI/CD', 'Kubernetes', 'Terraform'],
  'ci/cd': ['Jenkins', 'GitHub Actions', 'GitLab CI'],
  
  // UI/UX progression
  'figma': ['UI/UX Design', 'Prototyping', 'Design Systems'],
  'ui/ux design': ['Prototyping', 'Figma', 'Adobe XD'],
  'prototyping': ['UI/UX Design', 'User Research'],
  
  // Mobile Development
  'react native': ['Mobile Development', 'Expo'],
  'flutter': ['Mobile Development', 'Dart'],
  'swift': ['iOS Development', 'Xcode'],
  'kotlin': ['Android Development', 'Android Studio'],
  
  // Other technologies
  'git': ['GitHub', 'GitLab', 'CI/CD'],
  'github': ['CI/CD', 'GitHub Actions'],
  'redux': ['React', 'State Management'],
  'webpack': ['Build Tools', 'Vite'],
  'vite': ['Build Tools', 'Modern Frontend'],
};

/**
 * Normalize skill name for matching (lowercase, trim)
 * @param {string} skill - The skill to normalize
 * @returns {string} - Normalized skill name
 */
const normalizeSkill = (skill) => {
  if (!skill) return '';
  return skill.trim().toLowerCase();
};

/**
 * Get next skills for a given skill
 * @param {string} skill - The skill to get next skills for
 * @returns {string[]} - Array of next skills
 */
const getNextSkills = (skill) => {
  if (!skill) return [];
  const normalized = normalizeSkill(skill);
  return skillMapping[normalized] || [];
};

/**
 * Get all next skills for a user's skill set
 * @param {string[]} userSkills - Array of user's skills
 * @returns {string[]} - Array of recommended next skills
 */
const getAllNextSkills = (userSkills) => {
  if (!userSkills || userSkills.length === 0) return [];
  
  const nextSkillsSet = new Set();
  userSkills.forEach(skill => {
    const nextSkills = getNextSkills(skill);
    nextSkills.forEach(nextSkill => nextSkillsSet.add(nextSkill));
  });
  
  return Array.from(nextSkillsSet);
};

/**
 * Check if a skill is a next skill for any of the user's skills
 * @param {string} skill - The skill to check
 * @param {string[]} userSkills - Array of user's skills
 * @returns {boolean} - True if the skill is a recommended next skill
 */
const isNextSkill = (skill, userSkills) => {
  if (!userSkills || userSkills.length === 0 || !skill) return false;
  const allNextSkills = getAllNextSkills(userSkills);
  const normalizedSkill = normalizeSkill(skill);
  return allNextSkills.some(nextSkill => 
    normalizeSkill(nextSkill) === normalizedSkill
  );
};

module.exports = {
  skillMapping,
  getNextSkills,
  getAllNextSkills,
  isNextSkill,
  normalizeSkill
};

