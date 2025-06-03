const { validationResult } = require('express-validator');
const { createResponse } = require('../utils/response');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json(
      createResponse(false, 'Validation failed', { errors: formattedErrors }, 'VALIDATION_ERROR')
    );
  }
  
  next();
};

module.exports = {
  handleValidationErrors
};