const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   POST /api/v1/payments/create-order
 * @desc    Create Razorpay order
 * @access  Private
 */
// router.post('/create-order', [
//   authenticateToken,
//   body('amount')
//     .isFloat({ min: 1 })
//     .withMessage('Amount must be greater than 0'),
//   body('currency')
//     .optional()
//     .isIn(['INR', 'USD'])
//     .withMessage('Currency must be INR or USD'),
//   body('gameId')
//     .optional()
//     .isInt({ min: 1 })
//     .withMessage('Game ID must be a positive integer'),
//   body('slotId')
//     .optional()
//     .isInt({ min: 1 })
//     .withMessage('Slot ID must be a positive integer'),
//   handleValidationErrors
// ], paymentController.createOrder);

router.post('/create-order', authenticateToken, paymentController.createOrder);

/**
 * @route   POST /api/v1/payments/verify
 * @desc    Verify payment signature
 * @access  Private
 */
router.post('/verify', [
  authenticateToken,
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  body('gameId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Game ID must be a positive integer'),
  body('slotId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Slot ID must be a positive integer'),
  handleValidationErrors
], paymentController.verifyPayment);

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Handle payment webhook
 * @access  Public (Razorpay webhook)
 */
router.post('/webhook', paymentController.handlePaymentWebhook);

/**
 * @route   GET /api/v1/payments/history
 * @desc    Get payment history for user
 * @access  Private
 */
router.get('/history', [
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
    .isIn(['completed', 'failed', 'refunded'])
    .withMessage('Status must be one of: completed, failed, refunded'),
  handleValidationErrors
], paymentController.getPaymentHistory);

/**
 * @route   POST /api/v1/payments/:paymentId/refund
 * @desc    Initiate refund
 * @access  Private (Admin only)
 */
router.post('/:paymentId/refund', [
  authenticateToken,
  requireAdmin,
  param('paymentId')
    .isInt({ min: 1 })
    .withMessage('Payment ID must be a positive integer'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),
  body('reason')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Reason must be between 5 and 200 characters')
    .trim(),
  handleValidationErrors
], paymentController.initiateRefund);

/**
 * @route   GET /api/v1/payments/statistics
 * @desc    Get payment statistics
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
  query('groupBy')
    .optional()
    .isIn(['hour', 'day', 'month'])
    .withMessage('Group by must be one of: hour, day, month'),
  handleValidationErrors
], paymentController.getPaymentStatistics);

module.exports = router;