const prisma = require('../../config/db');
const { getRedisClient } = require('../../config/redis');
const { getPredictionQueue } = require('../../config/bullmq');
const logger = require('../../utils/logger');

async function getStats() {
  const [totalContainers, totalPredictions, totalUsers, totalJobs] = await Promise.all([
    prisma.container.count({ where: { deleted_at: null } }),
    prisma.prediction.count(),
    prisma.user.count(),
    prisma.batchJob.count(),
  ]);

  const jobsByStatus = await prisma.batchJob.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  let queueDepth = 0;
  try {
    const queue = getPredictionQueue();
    queueDepth = await queue.count();
  } catch (err) {
    logger.warn('Could not fetch queue depth', { error: err.message });
  }

  return {
    containers: { total: totalContainers },
    predictions: { total: totalPredictions },
    users: { total: totalUsers },
    jobs: {
      total: totalJobs,
      by_status: Object.fromEntries(jobsByStatus.map((s) => [s.status, s._count.status])),
      queue_depth: queueDepth,
    },
  };
}

async function flushRateLimitCache() {
  const redis = getRedisClient();
  // Only delete rate-limit keys, never flush the whole DB
  const keys = await redis.keys('rl:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  logger.info('Rate-limit cache flushed', { keysDeleted: keys.length });
  return { keys_deleted: keys.length };
}

module.exports = { getStats, flushRateLimitCache };
