const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Get all games with pagination and search
 * @param {Object} options - Filter and pagination options
 * @returns {Object} Games and pagination info
 */
const getAllGames = async (options = {}) => {
  try {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;
    
    // Build where clause for search
    let whereClause = 'WHERE status = "active"';
    const queryParams = [];
    
    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    // Get total count
    const totalResult = await executeQuery(
      `SELECT COUNT(*) as total FROM games ${whereClause}`,
      queryParams
    );
    
    // Get games with pagination
    const games = await executeQuery(
      `SELECT * FROM games ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );
    
    return {
      games,
      total: totalResult[0].total
    };
  } catch (error) {
    logger.error('Get all games service error:', error);
    throw error;
  }
};

/**
 * Get game by ID
 * @param {number} id - Game ID
 * @returns {Object} Game data
 */
const getGameById = async (id) => {
  try {
    const games = await executeQuery(
      'SELECT * FROM games WHERE id = ? AND status = "active"',
      [id]
    );
    
    if (games.length === 0) {
      throw new Error('Game not found');
    }
    
    return games[0];
  } catch (error) {
    logger.error('Get game by ID service error:', error);
    throw error;
  }
};

/**
 * Create new game
 * @param {Object} gameData - Game data
 * @returns {Object} Created game
 */
const createGame = async (gameData) => {
  try {
    const { name, description, image, entryFee, prizePool, maxPlayers } = gameData;
    
    // Validate required fields
    if (!name || !description || !entryFee || !prizePool || !maxPlayers) {
      throw new Error('Name, description, entry fee, prize pool, and max players are required');
    }
    
    const insertResult = await executeQuery(
      `INSERT INTO games (name, description, image, entryFee, prizePool, maxPlayers, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [name, description, image, entryFee, prizePool, maxPlayers]
    );
    
    return await getGameById(insertResult.insertId);
  } catch (error) {
    logger.error('Create game service error:', error);
    throw error;
  }
};

/**
 * Update game
 * @param {number} id - Game ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated game
 */
const updateGame = async (id, updateData) => {
  try {
    const allowedFields = ['name', 'description', 'image', 'entryFee', 'prizePool', 'maxPlayers', 'status'];
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
      `UPDATE games SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );
    
    return await getGameById(id);
  } catch (error) {
    logger.error('Update game service error:', error);
    throw error;
  }
};

/**
 * Delete game (soft delete)
 * @param {number} id - Game ID
 */
const deleteGame = async (id) => {
  try {
    // Check if game has active slots
    const activeSlots = await executeQuery(
      'SELECT COUNT(*) as count FROM slots WHERE gameId = ? AND status IN ("waiting", "started")',
      [id]
    );
    
    if (activeSlots[0].count > 0) {
      throw new Error('Cannot delete game with active slots');
    }
    
    // Soft delete
    await executeQuery(
      'UPDATE games SET status = "deleted", updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    logger.info('Game soft deleted:', { gameId: id });
  } catch (error) {
    logger.error('Delete game service error:', error);
    throw error;
  }
};

/**
 * Get popular games
 * @param {number} limit - Number of games to return
 * @returns {Array} Popular games
 */
const getPopularGames = async (limit = 5) => {
  try {
    const games = await executeQuery(
      `SELECT g.*, COUNT(s.id) as slotCount 
       FROM games g 
       LEFT JOIN slots s ON g.id = s.gameId 
       WHERE g.status = 'active' 
       GROUP BY g.id 
       ORDER BY slotCount DESC, g.created_at DESC 
       LIMIT ?`,
      [limit]
    );
    
    return games;
  } catch (error) {
    logger.error('Get popular games service error:', error);
    throw error;
  }
};

module.exports = {
  getAllGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  getPopularGames
};