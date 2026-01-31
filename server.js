require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Import Routes
const jobsRoute = require('./routes/jobsRoute');
const applicationsRoute = require('./routes/applicationsRoute');
const usersRoute = require('./routes/usersRoute');
const authRoute = require('./routes/authRoute');

// Mount API Routes
app.use('/api/jobs', jobsRoute);
app.use('/api/applications', applicationsRoute);
app.use('/api/users', usersRoute);
app.use('/api/auth', authRoute);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve jobs page (swipe to find jobs)
app.get('/jobs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'jobs.html'));
});

// API 404 – always return JSON so the frontend never gets HTML
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({ statusCode: 404, message: 'API route not found', path: req.method + ' ' + req.path });
});

// Global error handler – return JSON (e.g. when express.json() or a route throws)
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ statusCode: 500, message: err.message || 'Server error', error: String(err) });
});

// Socket.IO - Real-time features
io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // User joins their personal room for notifications
    socket.on('joinRoom', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined their notification room`);
    });

    // Real-time job application
    socket.on('applyJob', (data) => {
        console.log(`📝 New application:`, data);
        
        // Broadcast to all connected clients that a new application was made
        io.emit('newApplication', {
            jobId: data.jobId,
            jobTitle: data.jobTitle,
            applicantName: data.applicantName,
            timestamp: new Date().toISOString()
        });

        // Send confirmation to the applicant
        socket.emit('applicationConfirmed', {
            success: true,
            message: `Successfully applied to ${data.jobTitle}`,
            applicationId: `APP-${Date.now()}`
        });
    });

    // Real-time job search/filter
    socket.on('searchJobs', (query) => {
        console.log(`🔍 Search query:`, query);
        // In production, this would query the database
        socket.emit('searchResults', { query, timestamp: new Date().toISOString() });
    });

    // Real-time notifications
    socket.on('sendNotification', (data) => {
        io.to(`user_${data.userId}`).emit('notification', {
            type: data.type,
            message: data.message,
            timestamp: new Date().toISOString()
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

// Make io accessible to routes
app.set('io', io);

// Connect to MongoDB then start server
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 JobFinder Platform running at http://localhost:${PORT}`);
        console.log(`📡 Socket.IO ready for real-time connections`);
        console.log(`📂 API Endpoints:`);
        console.log(`   GET  /api/jobs          - List all jobs`);
        console.log(`   GET  /api/jobs/:id      - Get job by ID`);
        console.log(`   POST /api/jobs          - Create new job`);
        console.log(`   GET  /api/applications  - List applications`);
        console.log(`   POST /api/applications  - Submit application`);
        console.log(`   GET  /api/users         - List users`);
    });
}).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

module.exports = { app, io };
