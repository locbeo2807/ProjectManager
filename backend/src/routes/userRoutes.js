const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');
const upload = require('../middleware/cloudinaryUpload');
const validate = require('../middleware/validate');
const { userUpdateSchema, createUserSchema, updateUserRoleSchema, changePasswordSchema } = require('../utils/validation');

// GET /api/users/check-id/:userID - Check if a userID exists
router.get('/check-id/:userID', userController.checkUserId);

// PUT /api/users/:id/avatar - Update user avatar
router.put('/:id/avatar', authenticate, upload.single('avatar'), userController.updateAvatar);

// POST /api/users - Create a new user
router.post('/', authenticate, authorize(['PM']), validate(createUserSchema), userController.createUser);

// GET /api/users - Get all users
// Cho phép PM và BA xem danh sách user để thêm nhân sự vào dự án
router.get('/', authenticate, authorize(['PM', 'BA']), userController.getAllUsers);

// GET /api/users/search?q=... - Search users by name or email (authenticated users)
router.get('/search', authenticate, userController.searchUsers);

// GET /api/users/emails - Get all registered user emails
router.get('/emails', authenticate, userController.getAllUserEmails);

// GET /api/users/:id - Get a user by ID or userID
router.get('/:id', authenticate, userController.getUser);

// PUT /api/users/:id - Update a user by ID
router.put('/:id', authenticate, validate(userUpdateSchema), userController.updateUser);

// PATCH /api/users/:id/role - Update a user's role
router.patch('/:id/role', authenticate, authorize(['PM']), validate(updateUserRoleSchema), userController.updateUserRole);

// PUT /api/users/:id/change-password - Change a user's password
router.put('/:id/change-password', authenticate, validate(changePasswordSchema), userController.changePassword);

// POST /api/users/enable-2fa - Enable two-factor authentication
router.post('/enable-2fa', authenticate, userController.enable2FA);

// POST /api/users/disable-2fa - Disable two-factor authentication
router.post('/disable-2fa', authenticate, userController.disable2FA);

module.exports = router; 