const paymentService = require('../services/payment.service');
const { createResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * Create Razorpay order
 */
const createOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', gameId, slotId } = req.body;
    const { email } = req.user;
    
    console.log("At controller of payment", amount, currency, gameId, slotId);
    console.log("User info:", req.user);
    
    logger.info('Payment order creation:', { email, amount, gameId, slotId });
    
    const order = await paymentService.createOrder({
      amount,
      currency,
      userEmail: email,
      gameId,
      slotId
    });
    
    res.status(201).json(
  createResponse(true, 'Payment order created successfully', {
    orderId: order.id,
    amount: order.amount / 100,   // convert paise back to rupees here
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID
  })
);

  } catch (error) {
    logger.error('Create order error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};


/**
 * Verify payment signature
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, gameId, slotId } = req.body;
    const { email } = req.user;
    
    logger.info('Payment verification:', { email, orderId: razorpay_order_id, paymentId: razorpay_payment_id });
    
    const verification = await paymentService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userEmail: email,
      gameId,
      slotId
    });
    
    if (verification.success) {
      logger.info('Payment verified successfully:', { 
        email, 
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id 
      });
      
      res.status(200).json(
        createResponse(true, 'Payment verified and processed successfully', {
          payment: verification.payment,
          slot: verification.slot
        })
      );
    } else {
      logger.warn('Payment verification failed:', { 
        email, 
        paymentId: razorpay_payment_id,
        reason: verification.message 
      });
      
      res.status(400).json(
        createResponse(false, verification.message || 'Payment verification failed')
      );
    }
  } catch (error) {
    logger.error('Verify payment error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

/**
 * Handle payment success webhook
 */
const handlePaymentWebhook = async (req, res, next) => {
  try {
    const webhookData = req.body;
    
    logger.info('Payment webhook received:', { event: webhookData.event });
    
    await paymentService.handleWebhook(webhookData);
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error('Payment webhook error:', error.message);
    next(error);
  }
};

/**
 * Get payment history for user
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const { email } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    const result = await paymentService.getPaymentHistory(email, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    
    res.status(200).json(
      createPaginatedResponse(true, 'Payment history retrieved successfully', result.payments, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total
      })
    );
  } catch (error) {
    logger.error('Get payment history error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

/**
 * Initiate refund (Admin only)
 */
const initiateRefund = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;
    
    logger.info('Refund initiation:', { paymentId, amount, reason });
    
    const refund = await paymentService.initiateRefund(paymentId, { amount, reason });
    
    logger.info('Refund initiated successfully:', { paymentId, refundId: refund.id });
    
    res.status(200).json(
      createResponse(true, 'Refund initiated successfully', { refund })
    );
  } catch (error) {
    logger.error('Initiate refund error:', { paymentId: req.params.paymentId, error: error.message });
    next(error);
  }
};

/**
 * Get payment statistics (Admin only)
 */
const getPaymentStatistics = async (req, res, next) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    
    const stats = await paymentService.getPaymentStatistics({ from, to, groupBy });
    
    res.status(200).json(
      createResponse(true, 'Payment statistics retrieved successfully', { stats })
    );
  } catch (error) {
    logger.error('Get payment statistics error:', error.message);
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handlePaymentWebhook,
  getPaymentHistory,
  initiateRefund,
  getPaymentStatistics
};