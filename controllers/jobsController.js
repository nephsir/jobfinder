const jobsService = require('../services/jobsService');

const getAllJobs = async (req, res) => {
    try {
        const jobs = await jobsService.getAllJobs();
        res.status(200).json({
            statusCode: 200,
            data: jobs,
            message: 'Jobs retrieved successfully',
            count: jobs.length
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving jobs',
            error: error.message
        });
    }
};

// Get jobs posted by the authenticated employer
const getMyJobs = async (req, res) => {
    try {
        const employerId = req.user.id;
        const jobs = await jobsService.getJobsByEmployer(employerId);
        res.status(200).json({
            statusCode: 200,
            data: jobs,
            message: 'Your jobs retrieved successfully',
            count: jobs.length
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving your jobs',
            error: error.message
        });
    }
};

const searchJobs = async (req, res) => {
    try {
        const { keyword, location, category, type, salary } = req.query;
        const jobs = await jobsService.searchJobs({ keyword, location, category, type, salary });
        res.status(200).json({
            statusCode: 200,
            data: jobs,
            message: 'Search completed',
            count: jobs.length
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error searching jobs',
            error: error.message
        });
    }
};

const getCategories = async (req, res) => {
    try {
        const categories = jobsService.getCategories();
        res.status(200).json({
            statusCode: 200,
            data: categories,
            message: 'Categories retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving categories',
            error: error.message
        });
    }
};

const getJobTitlesForProfile = async (req, res) => {
    try {
        const titles = await jobsService.getJobTitlesForProfile();
        res.status(200).json({
            statusCode: 200,
            data: titles,
            message: 'Job titles retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving job titles',
            error: error.message
        });
    }
};

const getJobById = async (req, res) => {
    try {
        const job = await jobsService.getJobById(req.params.id);
        if (job) {
            res.status(200).json({
                statusCode: 200,
                data: job,
                message: 'Job found'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Job not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error retrieving job',
            error: error.message
        });
    }
};

const createJob = async (req, res) => {
    try {
        // Add employerId from authenticated user if available
        const jobData = { ...req.body };
        if (req.user && req.user.id) {
            jobData.employerId = req.user.id;
        }
        
        const newJob = await jobsService.createJob(jobData);

        const io = req.app.get('io');
        if (io) {
            io.emit('newJob', {
                job: newJob,
                message: `New job posted: ${newJob.title}`,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            statusCode: 201,
            data: newJob,
            message: 'Job created successfully'
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error creating job',
            error: error.message
        });
    }
};

const updateJob = async (req, res) => {
    try {
        const updatedJob = await jobsService.updateJob(req.params.id, req.body);
        if (updatedJob) {
            res.status(200).json({
                statusCode: 200,
                data: updatedJob,
                message: 'Job updated successfully'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Job not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error updating job',
            error: error.message
        });
    }
};

const deleteJob = async (req, res) => {
    try {
        const deleted = await jobsService.deleteJob(req.params.id);
        if (deleted) {
            res.status(200).json({
                statusCode: 200,
                message: 'Job deleted successfully'
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: 'Job not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error deleting job',
            error: error.message
        });
    }
};

module.exports = {
    getAllJobs,
    getMyJobs,
    searchJobs,
    getCategories,
    getJobTitlesForProfile,
    getJobById,
    createJob,
    updateJob,
    deleteJob
};
