const { Router } = require('express');
const { checkHealth } = require('../../utils/apiClient');
const prisma = require('../../config/db');
const { getRedisClient } = require('../../config/redis');

const router = Router();
const HEALTH_CACHE_KEY = 'health:status';
const HEALTH_CACHE_TTL = 15; // seconds

// Wrap a promise with a timeout so a slow service can't hang the entire endpoint
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

router.get('/', async (req, res) => {
  const redis = getRedisClient();

  // Return cached result within TTL window
  try {
    const cached = await redis.get(HEALTH_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return res.status(200).json(parsed);
    }
  } catch (_) {
    // Redis unavailable — fall through to live check
  }

  const checks = await Promise.allSettled([
    withTimeout(prisma.$queryRaw`SELECT 1`, 3000),
    withTimeout(redis.ping(), 2000),
    withTimeout(checkHealth(), 5000),
  ]);

  const [db, redisCheck, mlService] = checks;

  const services = {
    database: db.status === 'fulfilled' ? 'ok' : 'error',
    redis: redisCheck.status === 'fulfilled' ? 'ok' : 'error',
    ml_service: mlService.status === 'fulfilled' && mlService.value ? 'ok' : 'error',
  };

  const allOk = Object.values(services).every((s) => s === 'ok');
  const payload = {
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services,
  };

  // Cache the result (best-effort — don't fail if Redis is down)
  try {
    await redis.set(HEALTH_CACHE_KEY, JSON.stringify(payload), { EX: HEALTH_CACHE_TTL });
  } catch (_) {}

  // Always return 200 so Railway/load-balancer healthchecks pass.
  // Consumers inspect the `status` field ("ok" | "degraded") for service state.
  return res.status(200).json(payload);
});

module.exports = router;
