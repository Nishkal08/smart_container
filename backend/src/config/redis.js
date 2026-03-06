const Redis = require('ioredis');
const envConfig = require('./env');
const logger = require('../utils/logger');

let redisClient = null;

function createRedisClient(options = {}) {
  const client = new Redis(envConfig.REDIS_URL, {
    password: envConfig.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    ...options,
  });

  client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  return client;
}

async function connectRedis() {
  redisClient = createRedisClient();
  await redisClient.connect();
  return redisClient;
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

// Separate connection for BullMQ (requires maxRetriesPerRequest: null)
function createBullMQConnection() {
  return createRedisClient({ maxRetriesPerRequest: null });
}

module.exports = { connectRedis, getRedisClient, createBullMQConnection };
