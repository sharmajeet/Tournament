const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const slotController = require('../controllers/slot.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   POST /api/v1/slots
 * @desc    Create or join slot
 * @access  Private
 */
router.post('/', [
  authenticateToken,
  body('gameId')
    .isInt({ min: 1 })
    .withMessage('Game ID must be a positive integer'),
  body('userName')
    .isLength({ min: 2, max: 50 })
    .withMessage('User name must be between 2 and 50 characters')
    .trim(),
  body('phoneNumber')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('ffId')
    .isLength({ min: 3, max: 20 })
    .withMessage('FF ID must be between 3 and 20 characters')
    .trim(),
  body('entryFee')
    .isFloat({ min: 0 })
    .withMessage('Entry fee must be a positive number'),
  body('prizePool')
    .isFloat({ min: 0 })
    .withMessage('Prize pool must be a positive number'),
  handleValidationErrors
], slotController.createOrJoinSlot);

/**
 * @route   GET /api/v1/slots
 * @desc    Get all slots
 * @access  Public
 */
router.get('/', [
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
    .isIn(['all', 'waiting', 'full', 'started', 'completed'])
    .withMessage('Status must be one of: all, waiting, full, started, completed'),
  query('gameId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Game ID must be a positive integer'),
  handleValidationErrors
], slotController.getAllSlots);

/**
 * @route   GET /api/v1/slots/:id
 * @desc    Get slot by ID
 * @access  Public
 */
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Slot ID must be a positive integer'),
  handleValidationErrors
], slotController.getSlotById);

/**
 * @route   PUT /api/v1/slots/:id
 * @desc    Update slot
 * @access  Private (Admin only)
 */
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  param('id')
    .isInt({ min: 1 })
    .withMessage('Slot ID must be a positive integer'),
  body('customId')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Custom ID must be between 3 and 20 characters'),
  body('customPassword')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Custom password must be between 3 and 20 characters'),
  body('status')
    .optional()
    .isIn(['waiting', 'full', 'started', 'completed'])
    .withMessage('Status must be one of: waiting, full, started, completed'),
  handleValidationErrors
], slotController.updateSlot);

/**
 * @route   POST /api/v1/slots/:id/start
 * @desc    Start slot/tournament
 * @access  Private (Admin only)
 */
router.post('/:id/start', [
  authenticateToken,
  requireAdmin,
  param('id')
    .isInt({ min: 1 })
    .withMessage('Slot ID must be a positive integer'),
  body('customId')
    .isLength({ min: 3, max: 20 })
    .withMessage('Custom ID must be between 3 and 20 characters'),
  body('customPassword')
    .isLength({ min: 3, max: 20 })
    .withMessage('Custom password must be between 3 and 20 characters'),
  handleValidationErrors
], slotController.startSlot);

/**
 * @route   POST /api/v1/slots/:id/complete
 * @desc    Complete slot/tournament
 * @access  Private (Admin only)
 */
router.post('/:id/complete', [
  authenticateToken,
  requireAdmin,
  param('id')
    .isInt({ min: 1 })
    .withMessage('Slot ID must be a positive integer'),
  body('results')
    .isArray({ min: 1 })
    .withMessage('Results must be an array with at least one item'),
  body('results.*.userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  body('results.*.position')
    .isInt({ min: 1 })
    .withMessage('Position must be a positive integer'),
  body('results.*.prizeWon')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Prize won must be a positive number'),
  handleValidationErrors
], slotController.completeSlot);

/**
 * @route   DELETE /api/v1/slots/:id/registration
 * @desc    Cancel slot registration
 * @access  Private
 */
router.delete('/:id/registration', [
  authenticateToken,
  param('id')
    .isInt({ min: 1 })
    .withMessage('Slot ID must be a positive integer'),
  handleValidationErrors
], slotController.cancelSlotRegistration);

/**
 * @route   GET /api/v1/slots/statistics
 * @desc    Get slot statistics
 * @access  Private (Admin only)
 */
router.get('/admin/statistics', [
  authenticateToken,
  requireAdmin,
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be a valid ISO date'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be a valid ISO date'),
  handleValidationErrors
], slotController.getSlotStatistics);

module.exports = router;