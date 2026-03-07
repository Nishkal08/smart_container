const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Limit connection pool size to prevent "too many clients" on shared PostgreSQL
const rawUrl = process.env.DATABASE_URL || '';
const dbUrl = rawUrl.includes('?')
  ? `${rawUrl}&connection_limit=3&pool_timeout=20`
  : `${rawUrl}?connection_limit=3&pool_timeout=20`;

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Prisma Query', { query: e.query, duration: `${e.duration}ms` });
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma Error', { message: e.message });
});

module.exports = prisma;
