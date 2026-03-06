const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const envConfig = require('./env');
const logger = require('../utils/logger');

let io = null;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: envConfig.CORS_ORIGINS.split(',').map(o => o.trim()),
      credentials: true,
    },
  });

  // ── Socket Auth Middleware ─────────────────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication token missing'));
      }
      const decoded = jwt.verify(token, envConfig.JWT_ACCESS_SECRET);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.userId;
    logger.info('Socket connected', { socketId: socket.id, userId });

    socket.on('subscribe:job', ({ job_id }) => {
      if (job_id) {
        socket.join(`job:${job_id}`);
        logger.debug('Socket subscribed to job', { socketId: socket.id, job_id });
      }
    });

    socket.on('unsubscribe:job', ({ job_id }) => {
      if (job_id) {
        socket.leave(`job:${job_id}`);
      }
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { socketId: socket.id });
    });
  });

  return io;
}

function getSocketServer() {
  return io;
}

/**
 * Emit job progress to all clients subscribed to a job room.
 */
function emitJobProgress(jobId, data) {
  if (io) {
    io.to(`job:${jobId}`).emit('job:progress', { job_id: jobId, ...data });
  }
}

function emitJobCompleted(jobId, data) {
  if (io) {
    io.to(`job:${jobId}`).emit('job:completed', { job_id: jobId, ...data });
  }
}

function emitJobFailed(jobId, data) {
  if (io) {
    io.to(`job:${jobId}`).emit('job:failed', { job_id: jobId, ...data });
  }
}

module.exports = { initSocketServer, getSocketServer, emitJobProgress, emitJobCompleted, emitJobFailed };
