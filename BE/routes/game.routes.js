const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const gameController = require('../controllers/game.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   GET /api/v1/games
 * @desc    Get all games
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
  query('search')
    .optional()
    .trim(),
  handleValidationErrors
], gameController.getAllGames);

/**
 * @route   GET /api/v1/games/popular
 * @desc    Get popular games
 * @access  Public
 */
router.get('/popular', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  handleValidationErrors
], gameController.getPopularGames);

/**
 * @route   GET /api/v1/games/:id
 * @desc    Get game by ID
 * @access  Public
 */
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Game ID must be a positive integer'),
  handleValidationErrors
], gameController.getGameById);

/**
 * @route   POST /api/v1/games
 * @desc    Create new game
 * @access  Private (Admin only)
 */
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .trim(),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('entryFee')
    .isFloat({ min: 0 })
    .withMessage('Entry fee must be a positive number'),
  body('prizePool')
    .isFloat({ min: 0 })
    .withMessage('Prize pool must be a positive number'),
  body('maxPlayers')
    .isInt({ min: 2, max: 100 })
    .withMessage('Max players must be between 2 and 100'),
  handleValidationErrors
], gameController.createGame);

/**
 * @route   PUT /api/v1/games/:id
 * @desc    Update game
 * @access  Private (Admin only)
 */
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  param('id')
    .isInt({ min: 1 })
    .withMessage('Game ID must be a positive integer'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .trim(),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('entryFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Entry fee must be a positive number'),
  body('prizePool')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Prize pool must be a positive number'),
  body('maxPlayers')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max players must be between 2 and 100'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
  handleValidationErrors
], gameController.updateGame);

/**
 * @route   DELETE /api/v1/games/:id
 * @desc    Delete game
 * @access  Private (Admin only)
 */
router.delete('/:id', [
  authenticateToken,
  requireAdmin,
  param('id')
    .isInt({ min: 1 })
    .withMessage('Game ID must be a positive integer'),
  handleValidationErrors
], gameController.deleteGame);

module.exports = router;