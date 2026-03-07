require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { initSocketServer } = require('./config/socket');
const { connectRedis } = require('./config/redis');
const envConfig = require('./config/env');
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Health route imported eagerly (no Redis dependency)
const healthRoutes = require('./modules/health/health.routes');

const app = express();
const httpServer = http.createServer(app);

// ── Initialize Socket.io ────────────────────────
initSocketServer(httpServer);

// ── Security Middleware ─────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = envConfig.CORS_ORIGINS.split(',').map(o => o.trim());
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));

// ── Body Parsing & Compression ──────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── HTTP Request Logging ────────────────────────
if (envConfig.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Routes ──────────────────────────────────────
// Health route registered eagerly (no Redis dependency)
app.use('/api/v1/health', healthRoutes);
// All other routes + error handlers are registered inside bootstrap() after
// Redis connects (rate-limit-redis needs a live client during construction)

// ── Bootstrap ───────────────────────────────────
async function bootstrap() {
  try {
    // Verify Redis connection
    await connectRedis();
    logger.info('Redis connected');

    // Set up Redis pub/sub bridge so socket events published by the
    // BullMQ worker (even in a separate process) reach Socket.IO.
    const { setupSocketBridge } = require('./config/socket');
    const { createBullMQConnection } = require('./config/redis');
    const socketSubscriber = createBullMQConnection();
    await socketSubscriber.connect();
    setupSocketBridge(socketSubscriber);

    // Register routes that depend on Redis (rate-limit-redis initializes
    // RedisStore synchronously in its constructor, so Redis must be ready first)
    const authRoutes = require('./modules/auth/auth.routes');
    const containerRoutes = require('./modules/containers/container.routes');
    const predictionRoutes = require('./modules/predictions/prediction.routes');
    const jobRoutes = require('./modules/jobs/job.routes');
    const analyticsRoutes = require('./modules/analytics/analytics.routes');
    const userRoutes = require('./modules/users/user.routes');
    const adminRoutes = require('./modules/admin/admin.routes');

    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/containers', containerRoutes);
    app.use('/api/v1/predictions', predictionRoutes);
    app.use('/api/v1/jobs', jobRoutes);
    app.use('/api/v1/analytics', analyticsRoutes);
    app.use('/api/v1/users', userRoutes);
    app.use('/api/v1/admin', adminRoutes);

    // ── Error Handling (must be last in the middleware chain) ──
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Start prediction worker
    require('./modules/jobs/workers/prediction.worker');
    logger.info('BullMQ prediction worker started');

    const port = envConfig.PORT;
    httpServer.listen(port, () => {
      logger.info(`SmartContainer API running on port ${port} [${envConfig.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Bootstrap failed', { error: err.message });
    process.exit(1);
  }
}

bootstrap();

// ── Graceful Shutdown ─────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, httpServer };
