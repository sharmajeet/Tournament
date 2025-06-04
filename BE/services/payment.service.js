const Razorpay = require('razorpay');
const crypto = require('crypto');
const { executeQuery, executeTransaction } = require('../config/database');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../config/environment');
const { logger } = require('../utils/logger');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

/**
 * Create Razorpay order
 * @param {Object} orderData - Order data
 * @returns {Object} Razorpay order
 */
const createOrder = async (orderData) => {
  try {
    console.log("At Service of payment" , orderData);
    const { amount, currency, userEmail, gameId, slotId } = orderData;
    
    // Get user
    const users = await executeQuery('SELECT id FROM users WHERE email = ?', [userEmail]);
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    // Validate game and slot if provided
    if (gameId) {
      const games = await executeQuery('SELECT id FROM games WHERE id = ? AND status = "active"', [gameId]);
      if (games.length === 0) {
        throw new Error('Game not found or inactive');
      }
    }
    
    if (slotId) {
      const slots = await executeQuery('SELECT id FROM slots WHERE id = ? AND status IN ("waiting", "full")', [slotId]);
      if (slots.length === 0) {
        throw new Error('Slot not found or not available');
      }
    }
    
    const options = {
      amount: amount * 100, // Convert to paise
      currency: currency || 'INR',
      receipt: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notes: {
        userEmail,
        gameId: gameId || '',
        slotId: slotId || ''
      }
    };
    
    const order = await razorpayInstance.orders.create(options);
    
    // Save order to database
    await executeQuery(
      `INSERT INTO payment_orders (orderId, userId, gameId, slotId, amount, currency, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'created', NOW())`,
      [order.id, users[0].id, gameId, slotId, amount, currency]
    );
    
    logger.info('Payment order created:', { orderId: order.id, userEmail, amount });
    
    return order;
  } catch (error) {
    logger.error('Create order service error:', error);
    throw error;
  }
};

/**
 * Verify payment signature and process payment
 * @param {Object} paymentData - Payment verification data
 * @returns {Object} Verification result
 */
const verifyPayment = async (paymentData) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      userEmail, 
      gameId, 
      slotId 
    } = paymentData;
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    
    const isSignatureValid = expectedSignature === razorpay_signature;
    
    if (!isSignatureValid) {
      throw new Error('Invalid payment signature');
    }
    
    // Get user
    const users = await executeQuery('SELECT id FROM users WHERE email = ?', [userEmail]);
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    return await executeTransaction(async (connection) => {
      // Update payment order status
      await connection.execute(
        'UPDATE payment_orders SET status = "verified", updated_at = NOW() WHERE orderId = ?',
        [razorpay_order_id]
      );
      
      // Get order details
      const [orders] = await connection.execute(
        'SELECT * FROM payment_orders WHERE orderId = ?',
        [razorpay_order_id]
      );
      
      if (orders.length === 0) {
        throw new Error('Order not found');
      }
      
      const order = orders[0];
      
      // Create payment record
      const [paymentResult] = await connection.execute(
        `INSERT INTO payments (orderId, paymentId, userId, gameId, slotId, amount, currency, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [razorpay_order_id, razorpay_payment_id, users[0].id, order.gameId, order.slotId, order.amount, order.currency]
      );
      
      let slot = null;
      
      // If payment is for slot registration, handle slot logic
      if (order.slotId) {
        // This would typically be handled by slot service
        // For now, just get slot details
        const [slots] = await connection.execute(
          `SELECT s.*, g.name as gameName 
           FROM slots s 
           JOIN games g ON s.gameId = g.id 
           WHERE s.id = ?`,
          [order.slotId]
        );
        
        if (slots.length > 0) {
          slot = slots[0];
        }
      }
      
      logger.info('Payment verified and processed:', { 
        orderId: razorpay_order_id, 
        paymentId: razorpay_payment_id, 
        userEmail 
      });
      
      return {
        success: true,
        payment: {
          id: paymentResult.insertId,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          amount: order.amount,
          currency: order.currency,
          status: 'completed'
        },
        slot
      };
    });
  } catch (error) {
    logger.error('Verify payment service error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Handle payment webhook
 * @param {Object} webhookData - Webhook payload
 */
const handleWebhook = async (webhookData) => {
  try {
    const { event, payload } = webhookData;
    
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      default:
        logger.info('Unhandled webhook event:', event);
    }
  } catch (error) {
    logger.error('Handle webhook service error:', error);
    throw error;
  }
};

/**
 * Handle payment captured webhook
 * @param {Object} payment - Payment entity
 */
const handlePaymentCaptured = async (payment) => {
  try {
    await executeQuery(
      'UPDATE payments SET status = "captured", updated_at = NOW() WHERE paymentId = ?',
      [payment.id]
    );
    
    logger.info('Payment captured via webhook:', { paymentId: payment.id });
  } catch (error) {
    logger.error('Handle payment captured error:', error);
    throw error;
  }
};

/**
 * Handle payment failed webhook
 * @param {Object} payment - Payment entity
 */
const handlePaymentFailed = async (payment) => {
  try {
    await executeQuery(
      'UPDATE payments SET status = "failed", updated_at = NOW() WHERE paymentId = ?',
      [payment.id]
    );
    
    logger.info('Payment failed via webhook:', { paymentId: payment.id });
  } catch (error) {
    logger.error('Handle payment failed error:', error);
    throw error;
  }
};

/**
 * Get payment history for user
 * @param {string} email - User email
 * @param {Object} options - Filter and pagination options
 * @returns {Object} Payment history
 */
const getPaymentHistory = async (email, options = {}) => {
  try {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    // Get user
    const users = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    // Build where clause
    let whereClause = 'WHERE p.userId = ?';
    const queryParams = [users[0].id];
    
    if (status) {
      whereClause += ' AND p.status = ?';
      queryParams.push(status);
    }
    
    // Get total count
    const totalResult = await executeQuery(
      `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
      queryParams
    );
    
    // Get payments
    const payments = await executeQuery(
      `SELECT p.*, g.name as gameName, s.slotId
       FROM payments p
       LEFT JOIN games g ON p.gameId = g.id
       LEFT JOIN slots s ON p.slotId = s.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );
    
    return {
      payments,
      total: totalResult[0].total
    };
  } catch (error) {
    logger.error('Get payment history service error:', error);
    throw error;
  }
};

/**
 * Initiate refund
 * @param {number} paymentId - Payment ID
 * @param {Object} refundData - Refund data
 * @returns {Object} Refund result
 */
const initiateRefund = async (paymentId, refundData) => {
  try {
    const { amount, reason } = refundData;
    
    // Get payment details
    const payments = await executeQuery(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );
    
    if (payments.length === 0) {
      throw new Error('Payment not found');
    }
    
    const payment = payments[0];
    
    if (payment.status !== 'completed' && payment.status !== 'captured') {
      throw new Error('Payment is not eligible for refund');
    }
    
    // Create refund with Razorpay
    const refund = await razorpayInstance.payments.refund(payment.paymentId, {
      amount: amount ? amount * 100 : payment.amount * 100, // Convert to paise
      notes: {
        reason: reason || 'Refund requested'
      }
    });
    
    // Save refund record
    await executeQuery(
      `INSERT INTO refunds (paymentId, refundId, amount, reason, status, created_at) 
       VALUES (?, ?, ?, ?, 'processing', NOW())`,
      [paymentId, refund.id, amount || payment.amount, reason]
    );
    
    logger.info('Refund initiated:', { paymentId, refundId: refund.id });
    
    return refund;
  } catch (error) {
    logger.error('Initiate refund service error:', error);
    throw error;
  }
};

/**
 * Get payment statistics
 * @param {Object} options - Filter options
 * @returns {Object} Payment statistics
 */
const getPaymentStatistics = async (options = {}) => {
  try {
    const { from, to, groupBy = 'day' } = options;
    
    let whereClause = '';
    let groupByClause = '';
    const queryParams = [];
    
    if (from && to) {
      whereClause = 'WHERE created_at BETWEEN ? AND ?';
      queryParams.push(from, to);
    }
    
    // Set group by clause based on groupBy parameter
    switch (groupBy) {
      case 'hour':
        groupByClause = 'GROUP BY DATE(created_at), HOUR(created_at)';
        break;
      case 'day':
        groupByClause = 'GROUP BY DATE(created_at)';
        break;
      case 'month':
        groupByClause = 'GROUP BY YEAR(created_at), MONTH(created_at)';
        break;
      default:
        groupByClause = 'GROUP BY DATE(created_at)';
    }
    
    // Get overall statistics
    const overallStats = await executeQuery(
      `SELECT 
         COUNT(*) as totalPayments,
         SUM(amount) as totalRevenue,
         AVG(amount) as avgAmount,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successfulPayments,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedPayments
       FROM payments ${whereClause}`,
      queryParams
    );
    
    // Get time-series data
    const timeSeriesData = await executeQuery(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as paymentCount,
         SUM(amount) as revenue
       FROM payments 
       ${whereClause}
       ${groupByClause}
       ORDER BY created_at`,
      queryParams
    );
    
    // Get game-wise statistics
    const gameWiseStats = await executeQuery(
      `SELECT g.name, COUNT(p.id) as paymentCount, SUM(p.amount) as revenue
       FROM payments p
       JOIN games g ON p.gameId = g.id
       ${whereClause}
       GROUP BY g.id, g.name
       ORDER BY revenue DESC`,
      queryParams
    );
    
    return {
      overall: overallStats[0],
      timeSeries: timeSeriesData,
      gameWise: gameWiseStats
    };
  } catch (error) {
    logger.error('Get payment statistics service error:', error);
    throw error;
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  initiateRefund,
  getPaymentStatistics
};