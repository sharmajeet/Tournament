const { executeQuery, executeTransaction } = require('../config/database');
const { MAX_PLAYERS_PER_SLOT } = require('../config/environment');
const { logger } = require('../utils/logger');

/**
 * Create new slot or join existing one
 * @param {string} email - User email
 * @param {Object} slotData - Slot data
 * @returns {Object} Slot result
 */
const createOrJoinSlot = async (email, slotData) => {
  try {
    const { gameId, userName, phoneNumber, ffId, entryFee, prizePool } = slotData;
    
    // Get user
    const users = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      throw new Error('User not found');
    }
    const user = users[0];
    
    // Check if user already registered for this game
    const existingRegistration = await executeQuery(
      `SELECT COUNT(*) as count 
       FROM players p 
       JOIN slots s ON p.slotId = s.id 
       WHERE p.userId = ? AND s.gameId = ? AND s.status IN ('waiting', 'started')`,
      [user.id, gameId]
    );
    
    if (existingRegistration[0].count > 0) {
      throw new Error('Already registered for this game');
    }
    
    return await executeTransaction(async (connection) => {
      // Find open slot
      const [openSlots] = await connection.execute(
        `SELECT s.id FROM slots s
         LEFT JOIN players p ON s.id = p.slotId
         WHERE s.gameId = ? AND s.status = 'waiting'
         GROUP BY s.id
         HAVING COUNT(p.id) < ?
         LIMIT 1`,
        [gameId, MAX_PLAYERS_PER_SLOT]
      );
      
      let slotId;
      let isNewSlot = false;
      
      if (openSlots.length > 0) {
        slotId = openSlots[0].id;
      } else {
        // Create new slot
        const [newSlot] = await connection.execute(
          `INSERT INTO slots (slotId, gameId, entryFee, prizePool, status, created_at) 
           VALUES (?, ?, ?, ?, 'waiting', NOW())`,
          [Date.now(), gameId, entryFee, prizePool]
        );
        slotId = newSlot.insertId;
        isNewSlot = true;
      }
      
      // Register player
      await connection.execute(
        `INSERT INTO players (slotId, userId, name, phone, ffId, registered_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [slotId, user.id, userName, phoneNumber, ffId]
      );
      
      // Check if slot is now full
      const [[{ totalPlayers }]] = await connection.execute(
        'SELECT COUNT(*) as totalPlayers FROM players WHERE slotId = ?',
        [slotId]
      );
      
      if (totalPlayers >= MAX_PLAYERS_PER_SLOT) {
        await connection.execute(
          'UPDATE slots SET status = "full" WHERE id = ?',
          [slotId]
        );
      }
      
      // Get slot details
      const [slotDetails] = await connection.execute(
        `SELECT s.*, g.name as gameName 
         FROM slots s 
         JOIN games g ON s.gameId = g.id 
         WHERE s.id = ?`,
        [slotId]
      );
      
      return {
        slot: slotDetails[0],
        slotId,
        isNewSlot
      };
    });
  } catch (error) {
    logger.error('Create/join slot service error:', error);
    throw error;
  }
};

/**
 * Get all slots with filters
 * @param {Object} options - Filter and pagination options
 * @returns {Object} Slots and pagination info
 */
const getAllSlots = async (options = {}) => {
  try {
    const { page = 1, limit = 10, status = 'all', gameId } = options;
    const offset = (page - 1) * limit;
    
    // Build where clause
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    
    if (status !== 'all') {
      whereClause += ' AND s.status = ?';
      queryParams.push(status);
    }
    
    if (gameId) {
      whereClause += ' AND s.gameId = ?';
      queryParams.push(gameId);
    }
    
    // Get total count
    const totalResult = await executeQuery(
      `SELECT COUNT(*) as total 
       FROM slots s 
       JOIN games g ON s.gameId = g.id 
       ${whereClause}`,
      queryParams
    );
    
    // Get slots with player count
    const slots = await executeQuery(
      `SELECT s.*, g.name as gameName, g.image as gameImage,
              COUNT(p.id) as playerCount
       FROM slots s
       JOIN games g ON s.gameId = g.id
       LEFT JOIN players p ON s.id = p.slotId
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );
    
    return {
      slots,
      total: totalResult[0].total
    };
  } catch (error) {
    logger.error('Get all slots service error:', error);
    throw error;
  }
};

/**
 * Get slot by ID with players
 * @param {number} id - Slot ID
 * @returns {Object} Slot with players
 */
const getSlotById = async (id) => {
  try {
    // Get slot details
    const slots = await executeQuery(
      `SELECT s.*, g.name as gameName, g.image as gameImage 
       FROM slots s 
       JOIN games g ON s.gameId = g.id 
       WHERE s.id = ?`,
      [id]
    );
    
    if (slots.length === 0) {
      throw new Error('Slot not found');
    }
    
    // Get players
    const players = await executeQuery(
      `SELECT p.*, u.email 
       FROM players p 
       JOIN users u ON p.userId = u.id 
       WHERE p.slotId = ? 
       ORDER BY p.registered_at`,
      [id]
    );
    
    const slot = slots[0];
    slot.players = players;
    slot.playerCount = players.length;
    
    return slot;
  } catch (error) {
    logger.error('Get slot by ID service error:', error);
    throw error;
  }
};

/**
 * Update slot
 * @param {number} id - Slot ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated slot
 */
const updateSlot = async (id, updateData) => {
  try {
    const allowedFields = ['customId', 'customPassword', 'status', 'startedAt', 'completedAt'];
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
    
    updateValues.push(id);
    
    await executeQuery(
      `UPDATE slots SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );
    
    return await getSlotById(id);
  } catch (error) {
    logger.error('Update slot service error:', error);
    throw error;
  }
};

/**
 * Start slot/tournament
 * @param {number} id - Slot ID
 * @param {Object} startData - Start data
 * @returns {Object} Updated slot
 */
const startSlot = async (id, startData) => {
  try {
    const { customId, customPassword } = startData;
    
    // Check if slot is ready to start
    const slot = await getSlotById(id);
    
    if (slot.status !== 'full' && slot.status !== 'waiting') {
      throw new Error('Slot is not ready to start');
    }
    
    if (slot.playerCount < MAX_PLAYERS_PER_SLOT) {
      throw new Error(`Slot needs ${MAX_PLAYERS_PER_SLOT} players to start`);
    }
    
    await executeQuery(
      `UPDATE slots 
       SET status = 'started', customId = ?, customPassword = ?, startedAt = NOW(), updated_at = NOW() 
       WHERE id = ?`,
      [customId, customPassword, id]
    );
    
    return await getSlotById(id);
  } catch (error) {
    logger.error('Start slot service error:', error);
    throw error;
  }
};

/**
 * Complete slot/tournament
 * @param {number} id - Slot ID
 * @param {Array} results - Player results
 * @returns {Object} Updated slot
 */
const completeSlot = async (id, results) => {
  try {
    return await executeTransaction(async (connection) => {
      // Update slot status
      await connection.execute(
        'UPDATE slots SET status = "completed", completedAt = NOW(), updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      // Update player results
      for (const result of results) {
        await connection.execute(
          'UPDATE players SET position = ?, prizeWon = ? WHERE slotId = ? AND userId = ?',
          [result.position, result.prizeWon || 0, id, result.userId]
        );
      }
      
      return await getSlotById(id);
    });
  } catch (error) {
    logger.error('Complete slot service error:', error);
    throw error;
  }
};

/**
 * Cancel slot registration
 * @param {number} slotId - Slot ID
 * @param {string} email - User email
 */
const cancelSlotRegistration = async (slotId, email) => {
  try {
    // Get user
    const users = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    return await executeTransaction(async (connection) => {
      // Check if user is registered
      const [registrations] = await connection.execute(
        'SELECT * FROM players WHERE slotId = ? AND userId = ?',
        [slotId, users[0].id]
      );
      
      if (registrations.length === 0) {
        throw new Error('Registration not found');
      }
      
      // Check slot status
      const [slots] = await connection.execute(
        'SELECT status FROM slots WHERE id = ?',
        [slotId]
      );
      
      if (slots[0].status === 'started' || slots[0].status === 'completed') {
        throw new Error('Cannot cancel registration for started/completed slot');
      }
      
      // Remove player
      await connection.execute(
        'DELETE FROM players WHERE slotId = ? AND userId = ?',
        [slotId, users[0].id]
      );
      
      // Update slot status if needed
      const [[{ playerCount }]] = await connection.execute(
        'SELECT COUNT(*) as playerCount FROM players WHERE slotId = ?',
        [slotId]
      );
      
      if (playerCount < MAX_PLAYERS_PER_SLOT) {
        await connection.execute(
          'UPDATE slots SET status = "waiting" WHERE id = ?',
          [slotId]
        );
      }
    });
  } catch (error) {
    logger.error('Cancel slot registration service error:', error);
    throw error;
  }
};

/**
 * Get slot statistics
 * @param {Object} options - Filter options
 * @returns {Object} Statistics
 */
const getSlotStatistics = async (options = {}) => {
  try {
    const { from, to } = options;
    
    let whereClause = '';
    const queryParams = [];
    
    if (from && to) {
      whereClause = 'WHERE created_at BETWEEN ? AND ?';
      queryParams.push(from, to);
    }
    
    // Get basic stats
    const stats = await executeQuery(
      `SELECT 
         COUNT(*) as totalSlots,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedSlots,
         SUM(CASE WHEN status = 'started' THEN 1 ELSE 0 END) as activeSlots,
         SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waitingSlots,
         AVG(entryFee) as avgEntryFee,
         SUM(entryFee) as totalRevenue
       FROM slots ${whereClause}`,
      queryParams
    );
    
    // Get game-wise stats
    const gameStats = await executeQuery(
      `SELECT g.name, COUNT(s.id) as slotCount, SUM(s.entryFee) as revenue
       FROM slots s
       JOIN games g ON s.gameId = g.id
       ${whereClause}
       GROUP BY g.id, g.name
       ORDER BY slotCount DESC`,
      queryParams
    );
    
    return {
      overview: stats[0],
      gameWise: gameStats
    };
  } catch (error) {
    logger.error('Get slot statistics service error:', error);
    throw error;
  }
};

module.exports = {
  createOrJoinSlot,
  getAllSlots,
  getSlotById,
  updateSlot,
  startSlot,
  completeSlot,
  cancelSlotRegistration,
  getSlotStatistics
};