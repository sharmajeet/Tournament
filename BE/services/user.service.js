const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Object} User data
 */
const getUserByEmail = async (email) => {
  try {
    const users = await executeQuery(
      `SELECT id, email, name, phone, created_at, last_login 
       FROM users WHERE email = ?`,
      [email]
    );
    
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    return users[0];
  } catch (error) {
    logger.error('Get user by email service error:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} email - User email
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated user data
 */
const updateUserProfile = async (email, updateData) => {
  try {
    const allowedFields = ['name', 'phone'];
    const updateFields = [];
    const updateValues = [];
    
    // Filter allowed fields
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updateValues.push(email);
    
    await executeQuery(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE email = ?`,
      updateValues
    );
    
    // Return updated user
    return await getUserByEmail(email);
  } catch (error) {
    logger.error('Update user profile service error:', error);
    throw error;
  }
};

/**
 * Get user's registered slots
 * @param {string} email - User email
 * @param {Object} options - Pagination and filter options
 * @returns {Object} User slots and pagination info
 */
const getUserSlots = async (email, options = {}) => {
  try {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    // Get user ID
    const user = await getUserByEmail(email);
    
    // Build where clause
    let whereClause = 'WHERE p.userId = ?';
    const queryParams = [user.id];
    
    if (status && status !== 'all') {
      whereClause += ' AND s.status = ?';
      queryParams.push(status);
    }
    
    // Get total count
    const totalResult = await executeQuery(
      `SELECT COUNT(*) as total 
       FROM players p 
       JOIN slots s ON p.slotId = s.id 
       ${whereClause}`,
      queryParams
    );
    
    // Get slots with pagination
    const slots = await executeQuery(
      `SELECT s.*, g.name as gameName, g.image as gameImage,
              p.name as playerName, p.phone as playerPhone, p.ffId,
              p.registered_at
       FROM players p
       JOIN slots s ON p.slotId = s.id
       JOIN games g ON s.gameId = g.id
       ${whereClause}
       ORDER BY p.registered_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );
    
    return {
      slots,
      total: totalResult[0].total
    };
  } catch (error) {
    logger.error('Get user slots service error:', error);
    throw error;
  }
};

/**
 * Get user's payment history
 * @param {string} email - User email
 * @param {Object} options - Pagination options
 * @returns {Object} Payment history and pagination info
 */
const getPaymentHistory = async (email, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    
    // Get user ID
    const user = await getUserByEmail(email);
    
    // Get total count
    const totalResult = await executeQuery(
      'SELECT COUNT(*) as total FROM payments WHERE userId = ?',
      [user.id]
    );
    
    // Get payments with pagination
    const payments = await executeQuery(
      `SELECT p.*, g.name as gameName, s.slotId
       FROM payments p
       LEFT JOIN slots s ON p.slotId = s.id
       LEFT JOIN games g ON s.gameId = g.id
       WHERE p.userId = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
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
 * Delete user account
 * @param {string} email - User email
 */
const deleteUser = async (email) => {
  try {
    const user = await getUserByEmail(email);
    
    // Check for active slots
    const activeSlots = await executeQuery(
      `SELECT COUNT(*) as count 
       FROM players p 
       JOIN slots s ON p.slotId = s.id 
       WHERE p.userId = ? AND s.status IN ('waiting', 'started')`,
      [user.id]
    );
    
    if (activeSlots[0].count > 0) {
      throw new Error('Cannot delete account with active slot registrations');
    }
    
    // Delete user (cascade will handle related records)
    await executeQuery('DELETE FROM users WHERE id = ?', [user.id]);
    
    logger.info('User account deleted:', { email, userId: user.id });
  } catch (error) {
    logger.error('Delete user service error:', error);
    throw error;
  }
};

module.exports = {
  getUserByEmail,
  updateUserProfile,
  getUserSlots,
  getPaymentHistory,
  deleteUser
};