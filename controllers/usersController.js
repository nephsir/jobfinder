const usersService = require('../services/usersService');

const getAllUsers = async (req, res) => {
    try {
        const users = await usersService.getAllUsers();
        res.status(200).json({
            statusCode: 200,
            data: users,
            message: 'Users retrieved successfully',
            count: users.length
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving users',
            error: error.message
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await usersService.getUserById(req.params.id);
        if (user) {
            res.status(200).json({
                statusCode: 200,
                data: user,
                message: 'User found'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving user',
            error: error.message
        });
    }
};

const createUser = async (req, res) => {
    try {
        const newUser = await usersService.createUser(req.body);
        res.status(201).json({
            statusCode: 201,
            data: newUser,
            message: 'User created successfully'
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error creating user',
            error: error.message
        });
    }
};

const updateUser = async (req, res) => {
    try {
        if (req.user.id !== req.params.id) {
            return res.status(403).json({ statusCode: 403, message: 'You can only update your own profile' });
        }
        const { password, ...profileData } = req.body; // never update password via this endpoint
        const updatedUser = await usersService.updateUser(req.params.id, profileData);
        if (updatedUser) {
            res.status(200).json({
                statusCode: 200,
                data: updatedUser,
                message: 'User updated successfully'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error updating user',
            error: error.message
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const deleted = await usersService.deleteUser(req.params.id);
        if (deleted) {
            res.status(200).json({
                statusCode: 200,
                message: 'User deleted successfully'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error deleting user',
            error: error.message
        });
    }
};

// ===== My skipped jobs (auth required, uses req.user.id) =====
const getMySkipped = async (req, res) => {
    console.log('[API] GET /users/me/skipped - user:', req.user?.id);
    try {
        const skippedJobIds = await usersService.getSkippedJobIds(req.user.id);
        console.log('[API] Skipped jobs for user', req.user.id, ':', skippedJobIds);
        res.status(200).json({
            statusCode: 200,
            data: { skippedJobIds },
            message: 'Skipped jobs retrieved'
        });
    } catch (error) {
        console.error('[API] Error getting skipped:', error);
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving skipped jobs',
            error: error.message
        });
    }
};

const addSkipped = async (req, res) => {
    console.log('[API] POST /users/me/skipped - user:', req.user?.id, 'body:', req.body);
    try {
        const { jobId } = req.body;
        if (!jobId) {
            return res.status(400).json({ statusCode: 400, message: 'jobId required' });
        }
        const user = await usersService.addSkippedJob(req.user.id, jobId);
        console.log('[API] Added skipped job', jobId, 'for user', req.user.id, '- result:', user?.skippedJobIds);
        if (user) {
            res.status(200).json({
                statusCode: 200,
                data: user.skippedJobIds || [],
                message: 'Job skipped'
            });
        } else {
            res.status(404).json({ statusCode: 404, message: 'User not found' });
        }
    } catch (error) {
        console.error('[API] Error adding skipped:', error);
        res.status(500).json({
            statusCode: 500,
            message: 'Error adding skipped job',
            error: error.message
        });
    }
};

const removeSkipped = async (req, res) => {
    try {
        const { jobId } = req.params;
        const user = await usersService.removeSkippedJob(req.user.id, jobId);
        if (user) {
            res.status(200).json({
                statusCode: 200,
                data: user.skippedJobIds || [],
                message: 'Skipped job removed'
            });
        } else {
            res.status(404).json({ statusCode: 404, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error removing skipped job',
            error: error.message
        });
    }
};

const clearSkipped = async (req, res) => {
    try {
        const user = await usersService.clearSkippedJobs(req.user.id);
        if (user) {
            res.status(200).json({
                statusCode: 200,
                data: [],
                message: 'Skipped jobs cleared'
            });
        } else {
            res.status(404).json({ statusCode: 404, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error clearing skipped jobs',
            error: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getMySkipped,
    addSkipped,
    removeSkipped,
    clearSkipped
};
