const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applicationsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// RESTful API Routes for Applications
router.get('/', applicationsController.getAllApplications);
router.get('/me', authMiddleware, applicationsController.getMyApplications);
router.get('/user/:userId', applicationsController.getApplicationsByUser);
router.get('/:id', applicationsController.getApplicationById);
router.post('/', applicationsController.createApplication);
router.put('/:id/status', applicationsController.updateApplicationStatus);
router.delete('/me/by-job/:jobId', authMiddleware, applicationsController.deleteMyApplicationByJob);
router.delete('/:id', authMiddleware, applicationsController.deleteApplication);

module.exports = router;
