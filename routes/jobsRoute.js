const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobsController');
const authMiddleware = require('../middleware/authMiddleware');

// RESTful API Routes for Jobs (specific paths before :id)
router.get('/', jobsController.getAllJobs);
router.get('/me', authMiddleware, jobsController.getMyJobs);  // Get jobs posted by current employer
router.get('/search', jobsController.searchJobs);
router.get('/categories', jobsController.getCategories);
router.get('/titles', jobsController.getJobTitlesForProfile);
router.get('/:id', jobsController.getJobById);
router.post('/', authMiddleware, jobsController.createJob);  // Require auth to create job
router.put('/:id', authMiddleware, jobsController.updateJob);
router.delete('/:id', authMiddleware, jobsController.deleteJob);

module.exports = router;
