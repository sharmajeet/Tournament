const authService = require('../services/auth.service');
const { createResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * User login controller
 * Creates new user if doesn't exist, otherwise validates credentials
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    logger.info('Login attempt:', { email });
    
    const result = await authService.login(email, password);
    
    logger.info('Login successful:', { email, userId: result.user.id });
    
    res.status(200).json(
      createResponse(true, 'Login successful', {
        user: result.user,
        token: result.token
      })
    );
  } catch (error) {
    logger.error('Login error:', { email: req.body.email, error: error.message });
    next(error);
  }
};

/**
 * User registration controller
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    logger.info('Registration attempt:', { email, name });
    
    const result = await authService.register(email, password, name);
    
    logger.info('Registration successful:', { email, userId: result.user.id });
    
    res.status(201).json(
      createResponse(true, 'Registration successful', {
        user: result.user,
        token: result.token
      })
    );
  } catch (error) {
    logger.error('Registration error:', { email: req.body.email, error: error.message });
    next(error);
  }
};

/**
 * Refresh token controller
 */
const refreshToken = async (req, res, next) => {
  try {
    const { email } = req.user;
    
    const result = await authService.refreshToken(email);
    
    res.status(200).json(
      createResponse(true, 'Token refreshed successfully', {
        token: result.token
      })
    );
  } catch (error) {
    logger.error('Token refresh error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

/**
 * Logout controller
 */
const logout = async (req, res, next) => {
  try {
    // In a more complex app, you might want to blacklist the token
    logger.info('User logged out:', { email: req.user.email });
    
    res.status(200).json(
      createResponse(true, 'Logout successful')
    );
  } catch (error) {
    logger.error('Logout error:', { email: req.user?.email, error: error.message });
    next(error);
  }
};

module.exports = {
  login,
  register,
  refreshToken,
  logout
};