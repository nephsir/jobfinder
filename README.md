# JobFinder Platform

**Narrowing the Gap Between Application and Interview**

A streamlined job search platform that reduces the traditional 2-4 week hiring process to just 24-48 hours. Built for SIT725 Applied Software Engineering.

---

## Core Concept

> **Problem:** Traditional job applications take weeks to get a response, leaving candidates in limbo.
> 
> **Solution:** JobFinder's 3-step process gets you from application to interview in days, not weeks.

### The 3-Step Process

1. **Find Job** (30 seconds) - Search and filter jobs instantly
2. **Quick Apply** (10 seconds) - One-click apply with your saved profile
3. **Get Interview** (24-48 hours) - Schedule your interview directly in the app

---

## Technologies Used

| Category | Technologies |
|----------|--------------|
| **Runtime** | Node.js |
| **Back-end** | Express (^5.0.1) |
| **Database** | MongoDB (endpoint ready, implementation pending) |
| **Real-time** | Socket.IO (^4.8.3) |
| **Front-end** | HTML5, CSS3, JavaScript (ES6+) |
| **UI Framework** | Materialize CSS (1.0.0) |
| **Virtualization** | Docker (planned) |
| **Architecture** | MVC, RESTful API |

---

## Project Structure

```
GROUP PROJECT/
├── server.js                 # Express + Socket.IO server
├── package.json              # Dependencies
├── .gitignore
├── README.md
├── controllers/              # MVC Controllers
│   ├── index.js
│   ├── jobsController.js
│   ├── applicationsController.js
│   └── usersController.js
├── routes/                   # API Routes
│   ├── index.js
│   ├── jobsRoute.js
│   ├── applicationsRoute.js
│   └── usersRoute.js
├── services/                 # Business Logic / Data Layer
│   ├── index.js
│   ├── jobsService.js
│   ├── applicationsService.js
│   └── usersService.js
└── public/                   # Static Frontend
    ├── index.html
    ├── css/
    │   └── styles.css
    └── js/
        └── app.js
```

---

## Key Features

### For Job Seekers
- **Quick Profile** – Fill once, apply everywhere instantly
- **One-Click Apply** – Apply to jobs in 10 seconds
- **Match Score** – See how well you match each job
- **Interview Scheduling** – Pick your interview time directly
- **Real-time Notifications** – Instant updates on application status

### For Employers
- **Role Switcher** – Toggle between Job Seeker and Employer views in the nav
- **Post a Job** – Simple form to publish jobs (title, company, location, type, description, requirements, benefits)
- **Your Job Listings** – Dashboard of all jobs with application count per job
- **View Applications** – See applicants per job with name, email, phone, cover letter
- **Update Status** – Mark applications as Under Review, Interview Scheduled, Offer, or Not Selected
- **Employer Stats** – Active jobs count, applications received, avg. time to hire

### For the Platform
- **Responsive UI** – Mobile-first design with Materialize CSS
- **Real-time Updates** – Socket.IO for instant notifications
- **RESTful API** – Full CRUD operations for jobs, applications, users
- **MVC Architecture** – Clean separation of concerns

---

## API Endpoints

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/search` | Search with filters |
| GET | `/api/jobs/categories` | Get job categories |
| GET | `/api/jobs/:id` | Get job by ID |
| POST | `/api/jobs` | Create new job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List all applications |
| GET | `/api/applications/user/:userId` | Get user's applications |
| POST | `/api/applications` | Submit application |
| PUT | `/api/applications/:id/status` | Update status |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create user |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode (with nodemon)
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `newJob` | Server → Client | New job posted |
| `applyJob` | Client → Server | Submit application |
| `applicationConfirmed` | Server → Client | Application success |
| `newApplication` | Server → All | New application notification |
| `searchJobs` | Client → Server | Real-time search |

---

## Database (MongoDB + Mongoose)

The app uses **MongoDB** with **Mongoose**. See **[DATABASE_SETUP.md](DATABASE_SETUP.md)** for step-by-step setup.

**Quick start:**

1. Install MongoDB locally or use [MongoDB Atlas](https://cloud.mongodb.com).
2. Create a `.env` file with `MONGODB_URI=mongodb://localhost:27017/jobfinder` (or your Atlas URI).
3. Run `npm install` (includes `mongoose`).
4. Run `npm start` – the server connects to MongoDB before listening.
5. (Optional) Run `npm run seed` to insert sample jobs and users.

---

## Pending Implementation

- [ ] Docker containerization
- [ ] User authentication (JWT)
- [ ] File upload for resumes
- [ ] Unit tests with Mocha/Chai

---

## Full Technology List

- Node.js  
- Express (^5.0.1)  
- Socket.IO (^4.8.3)  
- MongoDB (planned)  
- Mongoose (planned)  
- HTML5  
- CSS3  
- JavaScript (ES6+)  
- Materialize CSS (1.0.0)  
- Docker (planned)  
- MVC Architecture  
- RESTful API  

---

---

## UI Highlights

- **Hero Section** – Clear 3-step visual showing the streamlined process
- **Quick Search** – Single search box for fast job discovery
- **Job Cards** – Show match score, response time, and quick apply button
- **Quick Apply Modal** – Pre-filled with profile data + interview availability
- **Success Flow** – Clear next steps after applying

---

*SIT725 Group Project – January 2026*
