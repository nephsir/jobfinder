const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authMiddleware } = require('../middleware/authMiddleware');

// RESTful API Routes for Users
router.get('/', usersController.getAllUsers);
// My skipped jobs (must be before /:id so "me" is not captured)
router.get('/me/skipped', authMiddleware, usersController.getMySkipped);
router.post('/me/skipped', authMiddleware, usersController.addSkipped);
router.delete('/me/skipped/:jobId', authMiddleware, usersController.removeSkipped);
router.put('/me/skipped/clear', authMiddleware, usersController.clearSkipped);
router.get('/:id', usersController.getUserById);
router.post('/', usersController.createUser);
router.put('/:id', authMiddleware, usersController.updateUser); // require login to update (own profile)
router.delete('/:id', usersController.deleteUser);

module.exports = router;
