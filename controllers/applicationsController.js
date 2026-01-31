const applicationsService = require('../services/applicationsService');

const getAllApplications = async (req, res) => {
    try {
        const applications = await applicationsService.getAllApplications();
        res.status(200).json({
            statusCode: 200,
            data: applications,
            message: 'Applications retrieved successfully',
            count: applications.length
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving applications',
            error: error.message
        });
    }
};

const getApplicationsByUser = async (req, res) => {
    try {
        const applications = await applicationsService.getApplicationsByUser(req.params.userId);
        res.status(200).json({
            statusCode: 200,
            data: applications,
            message: 'User applications retrieved successfully',
            count: applications.length
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving user applications',
            error: error.message
        });
    }
};

const getMyApplications = async (req, res) => {
    console.log('[API] GET /applications/me - user:', req.user?.id);
    try {
        const applications = await applicationsService.getApplicationsByUser(req.user.id);
        console.log('[API] Applications for user', req.user.id, ':', applications.length, 'found');
        res.status(200).json({
            statusCode: 200,
            data: applications,
            message: 'My applications retrieved',
            count: applications.length
        });
    } catch (error) {
        console.error('[API] Error getting applications:', error);
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving applications',
            error: error.message
        });
    }
};

const getApplicationById = async (req, res) => {
    try {
        const application = await applicationsService.getApplicationById(req.params.id);
        if (application) {
            res.status(200).json({
                statusCode: 200,
                data: application,
                message: 'Application found'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Application not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving application',
            error: error.message
        });
    }
};

const createApplication = async (req, res) => {
    try {
        const newApplication = await applicationsService.createApplication(req.body);

        const io = req.app.get('io');
        if (io) {
            io.emit('newApplication', {
                application: newApplication,
                message: `New application submitted for ${newApplication.jobTitle}`,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            statusCode: 201,
            data: newApplication,
            message: 'Application submitted successfully'
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error submitting application',
            error: error.message
        });
    }
};

const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const updatedApplication = await applicationsService.updateApplicationStatus(req.params.id, status);

        if (updatedApplication) {
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${updatedApplication.userId}`).emit('applicationStatusUpdate', {
                    applicationId: updatedApplication.id,
                    status: updatedApplication.status,
                    jobTitle: updatedApplication.jobTitle,
                    timestamp: new Date().toISOString()
                });
            }

            res.status(200).json({
                statusCode: 200,
                data: updatedApplication,
                message: 'Application status updated'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Application not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error updating application status',
            error: error.message
        });
    }
};

const deleteApplication = async (req, res) => {
    try {
        const app = await applicationsService.getApplicationById(req.params.id);
        if (!app) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Application not found'
            });
        }
        if (app.userId !== req.user.id) {
            return res.status(403).json({
                statusCode: 403,
                message: 'You can only delete your own application'
            });
        }
        const deleted = await applicationsService.deleteApplication(req.params.id);
        if (deleted) {
            res.status(200).json({
                statusCode: 200,
                message: 'Application deleted successfully'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Application not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error deleting application',
            error: error.message
        });
    }
};

const deleteMyApplicationByJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const deleted = await applicationsService.deleteApplicationByUserAndJob(req.user.id, jobId);
        if (deleted) {
            return res.status(200).json({
                statusCode: 200,
                message: 'Application removed successfully'
            });
        }
        return res.status(404).json({
            statusCode: 404,
            message: 'Application not found for this job'
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error removing application',
            error: error.message
        });
    }
};

module.exports = {
    getAllApplications,
    getMyApplications,
    getApplicationsByUser,
    getApplicationById,
    createApplication,
    updateApplicationStatus,
    deleteApplication,
    deleteMyApplicationByJob
};
