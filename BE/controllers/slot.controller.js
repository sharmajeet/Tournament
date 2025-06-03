const slotService = require('../services/slot.service');
const { createResponse, createPaginatedResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * Create new slot or join existing one
 */
const createOrJoinSlot = async (req, res, next) => {
  try {
    const { email } = req.user;
    const slotData = req.body;
    
    logger.info('Slot registration attempt:', { email, gameId: slotData.gameId });
    
    const result = await slotService.createOrJoinSlot(email, slotData);
    
    logger.info('Slot registration successful:', { 
      email, 
      slotId: result.slotId, 
      isNewSlot: result.isNewSlot 
    });
    
    res.status(201).json(
      createResponse(true, result.isNewSlot ? 'New slot created and joined successfully' : 'Joined existing slot successfully', {
        slot: result.slot,
        isNewSlot: result.isNewSlot
      })
    );
  } catch (error) {
    logger.error('Create/join slot error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

/**
 * Get all available slots
 */
const getAllSlots = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = 'all', gameId } = req.query;
    
    const result = await slotService.getAllSlots({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      gameId
    });
    
    res.status(200).json(
      createPaginatedResponse(true, 'Slots retrieved successfully', result.slots, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total
      })
    );
  } catch (error) {
    logger.error('Get all slots error:', error.message);
    next(error);
  }
};

/**
 * Get slot by ID with players
 */
const getSlotById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const slot = await slotService.getSlotById(id);
    
    res.status(200).json(
      createResponse(true, 'Slot retrieved successfully', { slot })
    );
  } catch (error) {
    logger.error('Get slot by ID error:', { slotId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Update slot (Admin only)
 */
const updateSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const slot = await slotService.updateSlot(id, updateData);
    
    logger.info('Slot updated:', { slotId: id, fields: Object.keys(updateData) });
    
    res.status(200).json(
      createResponse(true, 'Slot updated successfully', { slot })
    );
  } catch (error) {
    logger.error('Update slot error:', { slotId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Start slot/tournament (Admin only)
 */
const startSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { customId, customPassword } = req.body;
    
    const slot = await slotService.startSlot(id, { customId, customPassword });
    
    logger.info('Slot started:', { slotId: id, customId });
    
    res.status(200).json(
      createResponse(true, 'Slot started successfully', { slot })
    );
  } catch (error) {
    logger.error('Start slot error:', { slotId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Complete slot/tournament (Admin only)
 */
const completeSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { results } = req.body; // Array of player results
    
    const slot = await slotService.completeSlot(id, results);
    
    logger.info('Slot completed:', { slotId: id });
    
    res.status(200).json(
      createResponse(true, 'Slot completed successfully', { slot })
    );
  } catch (error) {
    logger.error('Complete slot error:', { slotId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Cancel slot registration
 */
const cancelSlotRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.user;
    
    await slotService.cancelSlotRegistration(id, email);
    
    logger.info('Slot registration cancelled:', { slotId: id, email });
    
    res.status(200).json(
      createResponse(true, 'Slot registration cancelled successfully')
    );
  } catch (error) {
    logger.error('Cancel slot registration error:', { 
      slotId: req.params.id, 
      email: req.user?.email, 
      error: error.message 
    });
    next(error);
  }
};

/**
 * Get slot statistics (Admin only)
 */
const getSlotStatistics = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    
    const stats = await slotService.getSlotStatistics({ from, to });
    
    res.status(200).json(
      createResponse(true, 'Slot statistics retrieved successfully', { stats })
    );
  } catch (error) {
    logger.error('Get slot statistics error:', error.message);
    next(error);
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