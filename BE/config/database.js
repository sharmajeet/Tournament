const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'tournament',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Connect to the database and test connection
 */
const connectDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ Successfully connected to MySQL database');
    connection.release();
    return pool;
  } catch (error) {
    logger.error('❌ Error connecting to MySQL database:', error);
    throw error;
  }
};

/**
 * Execute a database query
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    logger.error('Database query error:', { query, params, error: error.message });
    throw error;
  }
};

/**
 * Execute a transaction
 * @param {Function} callback - Transaction callback function
 * @returns {Promise} Transaction result
 */
const executeTransaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  connectDatabase,
  executeQuery,
  executeTransaction
};