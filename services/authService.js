const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');

const SALT_ROUNDS = 10;

async function signup(data) {
    const { email, password, firstName, lastName, phone, role, location, title, skills, avatar, companyName, industry, bio } = data;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        const err = new Error('Email already registered');
        err.code = 'EMAIL_EXISTS';
        throw err;
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || '',
        role: role || 'jobseeker',
        location: location || '',
        title: title || '',
        skills: Array.isArray(skills) ? skills : (skills ? [skills] : []),
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((firstName || '') + '+' + (lastName || ''))}&background=1976d2&color=fff`,
        // Employer-specific fields
        companyName: companyName || '',
        industry: industry || '',
        bio: bio || '',
        savedJobs: [],
        lastLogin: new Date().toISOString().split('T')[0]
    });
    const userObj = user.toObject();
    delete userObj.password;
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    return { user: toAuthUser(userObj), token };
}

async function login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password').lean();
    if (!user) {
        const err = new Error('Invalid email or password');
        err.code = 'INVALID_CREDENTIALS';
        throw err;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        const err = new Error('Invalid email or password');
        err.code = 'INVALID_CREDENTIALS';
        throw err;
    }
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date().toISOString().split('T')[0] });
    delete user.password;
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    return { user: toAuthUser(user), token };
}

function toAuthUser(doc) {
    return {
        id: doc._id.toString(),
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phone: doc.phone,
        role: doc.role,
        avatar: doc.avatar,
        location: doc.location,
        // Job seeker fields
        title: doc.title,
        skills: doc.skills || [],
        experience: doc.experience,
        education: doc.education,
        // Employer fields
        companyName: doc.companyName || '',
        industry: doc.industry || '',
        // Shared
        bio: doc.bio,
        savedJobs: doc.savedJobs ? doc.savedJobs.map(id => id.toString()) : [],
        lastLogin: doc.lastLogin
    };
}

module.exports = { signup, login };
