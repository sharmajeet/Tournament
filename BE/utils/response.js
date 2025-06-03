/**
 * Create standardized API response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {Object} data - Response data
 * @param {string} errorCode - Error code (optional)
 * @returns {Object} Formatted response
 */
const createResponse = (success, message, data = null, errorCode = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (!success && errorCode) {
    response.errorCode = errorCode;
  }

  return response;
};

/**
 * Create paginated response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {Array} data - Response data
 * @param {Object} pagination - Pagination info
 * @returns {Object} Formatted paginated response
 */
const createPaginatedResponse = (success, message, data, pagination) => {
  return {
    success,
    message,
    data,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      totalItems: pagination.total,
      itemsPerPage: pagination.limit,
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrevPage: pagination.page > 1
    },
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  createResponse,
  createPaginatedResponse
};