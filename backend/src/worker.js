/**
 * Standalone BullMQ worker process.
 * Run this instead of app.js to start a worker-only container with no HTTP server.
 * Used for the separate Railway "worker" service.
 */
require('dotenv').config();

const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');

async function startWorker() {
  try {
    await connectRedis();
    logger.info('Redis connected — worker mode');

    // Importing the worker module registers it with BullMQ automatically
    require('./modules/jobs/workers/prediction.worker');
    logger.info('BullMQ prediction worker started — listening for jobs');
  } catch (err) {
    logger.error('Worker startup failed', { error: err.message });
    process.exit(1);
  }
}

startWorker();

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — worker shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — worker shutting down');
  process.exit(0);
});
