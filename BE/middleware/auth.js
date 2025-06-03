const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/environment');
const { createResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json(
        createResponse(false, 'Access token is required for authentication', null, 'UNAUTHORIZED')
      );
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token attempt:', { token: token.substring(0, 20) + '...', error: err.message });
        return res.status(403).json(
          createResponse(false, 'Invalid or expired token', null, 'FORBIDDEN')
        );
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json(
      createResponse(false, 'Internal server error during authentication', null, 'INTERNAL_ERROR')
    );
  }
};

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Middleware to check if user is admin (optional)
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json(
      createResponse(false, 'Admin access required', null, 'FORBIDDEN')
    );
  }
};

module.exports = {
  authenticateToken,
  generateToken,
  requireAdmin
};