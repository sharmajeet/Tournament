const gameService = require('../services/game.service');
const { createResponse, createPaginatedResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * Get all games with pagination
 */
const getAllGames = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const result = await gameService.getAllGames({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });
    
    res.status(200).json(
      createPaginatedResponse(true, 'Games retrieved successfully', result.games, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total
      })
    );
  } catch (error) {
    logger.error('Get all games error:', error.message);
    next(error);
  }
};

/**
 * Get game by ID
 */
const getGameById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const game = await gameService.getGameById(id);
    
    res.status(200).json(
      createResponse(true, 'Game retrieved successfully', { game })
    );
  } catch (error) {
    logger.error('Get game by ID error:', { gameId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Create new game (Admin only)
 */
const createGame = async (req, res, next) => {
  try {
    const gameData = req.body;
    
    const game = await gameService.createGame(gameData);
    
    logger.info('Game created:', { gameId: game.id, name: game.name });
    
    res.status(201).json(
      createResponse(true, 'Game created successfully', { game })
    );
  } catch (error) {
    logger.error('Create game error:', error.message);
    next(error);
  }
};

/**
 * Update game (Admin only)
 */
const updateGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const game = await gameService.updateGame(id, updateData);
    
    logger.info('Game updated:', { gameId: id, fields: Object.keys(updateData) });
    
    res.status(200).json(
      createResponse(true, 'Game updated successfully', { game })
    );
  } catch (error) {
    logger.error('Update game error:', { gameId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Delete game (Admin only)
 */
const deleteGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await gameService.deleteGame(id);
    
    logger.info('Game deleted:', { gameId: id });
    
    res.status(200).json(
      createResponse(true, 'Game deleted successfully')
    );
  } catch (error) {
    logger.error('Delete game error:', { gameId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Get popular games
 */
const getPopularGames = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    
    const games = await gameService.getPopularGames(parseInt(limit));
    
    res.status(200).json(
      createResponse(true, 'Popular games retrieved successfully', { games })
    );
  } catch (error) {
    logger.error('Get popular games error:', error.message);
    next(error);
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