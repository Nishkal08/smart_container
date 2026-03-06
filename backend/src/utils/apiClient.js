const axios = require('axios');
const envConfig = require('../config/env');
const logger = require('./logger');

const mlClient = axios.create({
  baseURL: envConfig.ML_SERVICE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-API-Key': envConfig.ML_SERVICE_API_KEY,
  },
});

// Log outgoing requests in development
mlClient.interceptors.request.use((config) => {
  logger.debug('ML Service Request', { method: config.method?.toUpperCase(), url: config.url });
  return config;
});

mlClient.interceptors.response.use(
  (response) => response,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.detail || err.message;
    logger.error('ML Service Error', { status, message, url: err.config?.url });

    if (!err.response) {
      const serviceError = new Error('ML service is unreachable');
      serviceError.code = 'ML_SERVICE_UNAVAILABLE';
      serviceError.statusCode = 503;
      throw serviceError;
    }

    throw err;
  }
);

/**
 * Predict risk for a single container.
 * @param {Object} containerData - Container fields
 * @returns {Promise<Object>} Prediction result from ML service
 */
async function predictSingle(containerData) {
  const { data } = await mlClient.post('/predict/single', containerData);
  return data;
}

/**
 * Predict risk for a batch of containers.
 * @param {Array} containers - Array of container objects
 * @returns {Promise<Array>} Array of prediction results
 */
async function predictBatch(containers) {
  const { data } = await mlClient.post('/predict/batch', { containers });
  return data;
}

/**
 * Check ML service health.
 * @returns {Promise<boolean>}
 */
async function checkHealth() {
  try {
    await mlClient.get('/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = { predictSingle, predictBatch, checkHealth };
