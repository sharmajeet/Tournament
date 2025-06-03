const userService = require('../services/user.service');
const { createResponse, createPaginatedResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const { email } = req.user;
    
    const user = await userService.getUserByEmail(email);
    
    res.status(200).json(
      createResponse(true, 'Profile retrieved successfully', { user })
    );
  } catch (error) {
    logger.error('Get profile error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { email } = req.user;
    const updateData = req.body;
    
    const user = await userService.updateUserProfile(email, updateData);
    
    logger.info('Profile updated:', { email, fields: Object.keys(updateData) });
    
    res.status(200).json(
      createResponse(true, 'Profile updated successfully', { user })
    );
  } catch (error) {
    logger.error('Update profile error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

/**
 * Get user's registered slots
 */
const getUserSlots = async (req, res, next) => {
  try {
    const { email } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    const result = await userService.getUserSlots(email, { page: parseInt(page), limit: parseInt(limit), status });
    
    res.status(200).json(
      createPaginatedResponse(true, 'User slots retrieved successfully', result.slots, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total
      })
    );
  } catch (error) {
    logger.error('Get user slots error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

/**
 * Get user's payment history
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const { email } = req.user;
    const { page = 1, limit = 10 } = req.query;
    
    const result = await userService.getPaymentHistory(email, { page: parseInt(page), limit: parseInt(limit) });
    
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
 * Delete user account
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { email } = req.user;
    
    await userService.deleteUser(email);
    
    logger.info('User account deleted:', { email });
    
    res.status(200).json(
      createResponse(true, 'Account deleted successfully')
    );
  } catch (error) {
    logger.error('Delete account error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUserSlots,
  getPaymentHistory,
  deleteAccount
};