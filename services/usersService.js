// Users Service – MongoDB via Mongoose

const User = require('../models/User');
const mongoose = require('mongoose');

const getAllUsers = async () => {
    const users = await User.find().select('-password').lean();
    return users.map(toUserResponse);
};

const getUserById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const user = await User.findById(id).select('-password').lean();
    return user ? toUserResponse(user) : null;
};

const createUser = async (userData) => {
    const doc = await User.create({
        ...userData,
        role: userData.role || 'jobseeker',
        avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((userData.firstName || '') + '+' + (userData.lastName || ''))}&background=random&color=fff`,
        savedJobs: userData.savedJobs || [],
        lastLogin: new Date().toISOString().split('T')[0]
    });
    return toUserResponse(doc.toObject());
};

const updateUser = async (id, userData) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const user = await User.findByIdAndUpdate(id, { $set: userData }, { new: true }).select('-password').lean();
    return user ? toUserResponse(user) : null;
};

const deleteUser = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await User.findByIdAndDelete(id);
    return !!result;
};

function toUserResponse(doc) {
    return {
        id: doc._id.toString(),
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phone: doc.phone,
        role: doc.role,
        avatar: doc.avatar,
        location: doc.location,
        title: doc.title,
        skills: doc.skills,
        experience: doc.experience,
        education: doc.education,
        bio: doc.bio,
        savedJobs: doc.savedJobs ? doc.savedJobs.map(id => id.toString()) : [],
        skippedJobIds: Array.isArray(doc.skippedJobIds) ? doc.skippedJobIds : [],
        createdAt: doc.createdAt,
        lastLogin: doc.lastLogin
    };
}

const getSkippedJobIds = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    const user = await User.findById(userId).select('skippedJobIds').lean();
    return user && Array.isArray(user.skippedJobIds) ? user.skippedJobIds : [];
};

const addSkippedJob = async (userId, jobId) => {
    if (!mongoose.Types.ObjectId.isValid(userId) || !jobId) return null;
    const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { skippedJobIds: String(jobId) } },
        { new: true }
    ).select('-password').lean();
    return user ? toUserResponse(user) : null;
};

const removeSkippedJob = async (userId, jobId) => {
    if (!mongoose.Types.ObjectId.isValid(userId) || !jobId) return null;
    const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { skippedJobIds: String(jobId) } },
        { new: true }
    ).select('-password').lean();
    return user ? toUserResponse(user) : null;
};

const clearSkippedJobs = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const user = await User.findByIdAndUpdate(
        userId,
        { $set: { skippedJobIds: [] } },
        { new: true }
    ).select('-password').lean();
    return user ? toUserResponse(user) : null;
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getSkippedJobIds,
    addSkippedJob,
    removeSkippedJob,
    clearSkippedJobs
};
