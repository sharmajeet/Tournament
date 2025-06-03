const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', [
  authenticateToken,
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
], userController.updateProfile);

/**
 * @route   GET /api/v1/users/slots
 * @desc    Get user's registered slots
 * @access  Private
 */
router.get('/slots', [
  authenticateToken,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['all', 'waiting', 'started', 'completed'])
    .withMessage('Status must be one of: all, waiting, started, completed'),
  handleValidationErrors
], userController.getUserSlots);

/**
 * @route   GET /api/v1/users/payments
 * @desc    Get user's payment history
 * @access  Private
 */
router.get('/payments', [
  authenticateToken,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
], userController.getPaymentHistory);

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', authenticateToken, userController.deleteAccount);

module.exports = router;