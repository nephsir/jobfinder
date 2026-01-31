const authService = require('../services/authService');
const User = require('../models/User');

const signup = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, role, location, title, skills } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ statusCode: 400, message: 'Email and password are required' });
        }
        if (!firstName || !lastName) {
            return res.status(400).json({ statusCode: 400, message: 'First name and last name are required' });
        }
        const result = await authService.signup({ email, password, firstName, lastName, phone, role, location, title, skills });
        return res.status(201).json({
            statusCode: 201,
            data: result,
            message: 'Account created successfully'
        });
    } catch (err) {
        console.error('Signup error:', err);
        if (err.code === 'EMAIL_EXISTS') {
            return res.status(409).json({ statusCode: 409, message: 'Email already registered' });
        }
        return res.status(500).json({ statusCode: 500, message: err.message || 'Signup failed', error: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ statusCode: 400, message: 'Email and password are required' });
        }
        const result = await authService.login(email, password);
        res.status(200).json({
            statusCode: 200,
            data: result,
            message: 'Logged in successfully'
        });
    } catch (err) {
        if (err.code === 'INVALID_CREDENTIALS') {
            return res.status(401).json({ statusCode: 401, message: 'Invalid email or password' });
        }
        res.status(500).json({ statusCode: 500, message: err.message || 'Login failed', error: err.message });
    }
};

const me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ statusCode: 404, message: 'User not found' });
        }
        res.status(200).json({
            statusCode: 200,
            data: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
                location: user.location,
                title: user.title,
                skills: user.skills || [],
                experience: user.experience,
                education: user.education,
                bio: user.bio,
                savedJobs: user.savedJobs ? user.savedJobs.map(id => id.toString()) : [],
                lastLogin: user.lastLogin
            },
            message: 'User found'
        });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error fetching user', error: err.message });
    }
};

module.exports = { signup, login, me };
