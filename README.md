# 🎓 Campus Collab

[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-success.svg)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)](https://tailwindcss.com/)

**Campus Collab** is a robust Full-Stack MERN application built to foster academic collaboration and streamline communication between students and faculty. It acts as a centralized digital campus where students can team up for projects, faculty can share vital opportunities, and admins can manage the ecosystem efficiently.

---

## 🚀 Key Features

### 🏢 Core Hubs
* **Projects Board:** Students can pitch ideas, specify required skills/roles, and form dream teams. Track project status, comment, and engage with peers.
* **Internships & Hackathons:** A dedicated space for faculty to post career opportunities and coding events. Students can filter by department, domain, and year.
* **Placement Drives:** Keep the student body informed about upcoming university hiring drives.
* **Course Links:** A categorized repository where faculty can drop essential learning materials and resources.

### 🛡️ Universal Authentication & Security
* **Role-Based Access Control:** Distinct experiences and permissions for Students, Faculty, and Administrators.
* **Universal Email Verification:** Students and faculty can register using standard email addresses. Accounts are verified via secure OTPs powered by the Resend API.
* **Rate-Limiting:** Registration and password-reset endpoints are rate-limited to prevent spam and abuse.

### ✉️ Admin Bulk Email & Moderation
* **Rich-Text Email Campaigns:** Admins can compose highly stylized emails directly in the dashboard using a built-in Rich Text Editor (React Quill).
* **Smart Targeting:** Send manual emails to individual users, or broadcast bulk emails filtered precisely by **Department** and **Year**.
* **Content Moderation:** Abusive content is flagged automatically. Admins have a dedicated dashboard to review reports, restore content, or suspend users.

### 💬 Real-Time Interaction
* **Live Direct Messaging:** Powered by Socket.IO, users can chat 1-on-1 instantly with typing indicators and online statuses.
* **Smart Reminders:** Students can easily bookmark ("save") internships, hackathons, and placement drives for quick access later.
* **AI Recommendations:** Students receive personalized project recommendations based on their skills, liked domains, and participation history.

---

## 🛠️ Technology Stack

**Frontend:**
* React 18 (Vite)
* Tailwind CSS
* Framer Motion (Animations)
* React Router DOM
* React Quill (Rich Text Editor)
* Socket.IO Client

**Backend:**
* Node.js & Express.js
* MongoDB & Mongoose
* Socket.IO (Real-time WebSockets)
* JWT (JSON Web Tokens)
* Bcrypt.js (Password Hashing)
* Resend API (Transactional Email Delivery)
* Express Rate Limit

---

## ⚙️ Installation & Setup

### Prerequisites
* Node.js (v16+)
* MongoDB (running locally or via MongoDB Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/CampusCollab.git
cd CampusCollab
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campus-collab
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
FACULTY_REGISTRATION_CODE=FACULTY2024SECRET
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Start the frontend development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 👨‍💻 Usage Guide

1. **Student Registration**: Click "Register", select the Student role, fill in your details, and verify your email via the OTP sent to your inbox.
2. **Faculty Registration**: Select the Faculty role and enter the secret `FACULTY_REGISTRATION_CODE` defined in your environment variables to gain posting privileges.
3. **Admin Setup**: Register a normal user, then manually update their role to `"admin"` in your MongoDB database to unlock the Admin Dashboard and Bulk Email features.

---

## 📄 License
This project is created for educational and portfolio purposes.

**Happy Collaborating! 🎓**
