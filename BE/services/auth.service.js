const bcrypt = require('bcrypt');
const { executeQuery } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { BCRYPT_ROUNDS } = require('../config/environment');
const { logger } = require('../utils/logger');

/**
 * User login service
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} User data and token
 */
const login = async (email, password) => {
  try {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Check if user exists
    const users = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      // User doesn't exist, create new user
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      
      const insertResult = await executeQuery(
        'INSERT INTO users (email, password, created_at) VALUES (?, ?, NOW())',
        [email, hashedPassword]
      );
      
      const newUser = {
        id: insertResult.insertId,
        email,
        name: null,
        phone: null,
        created_at: new Date()
      };
      
      const token = generateToken({ id: newUser.id, email: newUser.email });
      
      logger.info('New user created and logged in:', { email, userId: newUser.id });
      
      return {
        user: newUser,
        token,
        isNewUser: true
      };
    } else {
      // User exists, verify password
      const user = users[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }
      
      // Update last login
      await executeQuery(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );
      
      const token = generateToken({ id: user.id, email: user.email });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      return {
        user: userWithoutPassword,
        token,
        isNewUser: false
      };
    }
  } catch (error) {
    logger.error('Login service error:', error);
    throw error;
  }
};

/**
 * User registration service
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User name
 * @returns {Object} User data and token
 */
const register = async (email, password, name) => {
  try {
    // Validate input
    if (!email || !password || !name) {
      throw new Error('Email, password, and name are required');
    }
    
    // Check if user already exists
    const existingUsers = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      throw new Error('User already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // Create user
    const insertResult = await executeQuery(
      'INSERT INTO users (email, password, name, created_at) VALUES (?, ?, ?, NOW())',
      [email, hashedPassword, name]
    );
    
    const newUser = {
      id: insertResult.insertId,
      email,
      name,
      phone: null,
      created_at: new Date()
    };
    
    const token = generateToken({ id: newUser.id, email: newUser.email });
    
    logger.info('User registered successfully:', { email, userId: newUser.id });
    
    return {
      user: newUser,
      token
    };
  } catch (error) {
    logger.error('Registration service error:', error);
    throw error;
  }
};

/**
 * Refresh token service
 * @param {string} email - User email
 * @returns {Object} New token
 */
const refreshToken = async (email) => {
  try {
    const users = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    const token = generateToken({ id: users[0].id, email });
    
    return { token };
  } catch (error) {
    logger.error('Refresh token service error:', error);
    throw error;
  }
};

module.exports = {
  login,
  register,
  refreshToken
};