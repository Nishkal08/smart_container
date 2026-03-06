const prisma = require('../../config/db');
const logger = require('../../utils/logger');

async function listContainers({ page, limit, origin_country, risk_level, trade_regime, date_from, date_to, search, batch_job_id, userId, isAdmin }) {
  const skip = (page - 1) * limit;

  // Build dynamic where clause
  const where = {};

  if (origin_country) where.origin_country = origin_country.toUpperCase();
  if (trade_regime) where.trade_regime = trade_regime;

  if (date_from || date_to) {
    where.declaration_date = {};
    if (date_from) where.declaration_date.gte = date_from;
    if (date_to) where.declaration_date.lte = date_to;
  }

  // Build AND conditions for ownership + search (both use OR internally, so must be combined via AND)
  const andConditions = [];
  if (!isAdmin && userId) {
    // Show containers owned by this user OR containers with no owner (legacy/shared data)
    andConditions.push({ OR: [{ uploaded_by: userId }, { uploaded_by: null }] });
  }
  if (search) {
    andConditions.push({
      OR: [
        { container_id: { contains: search, mode: 'insensitive' } },
        { importer_id: { contains: search, mode: 'insensitive' } },
        { exporter_id: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (andConditions.length > 0) where.AND = andConditions;

  // Filter by risk_level / batch_job_id requires a join on predictions
  const predFilter = {};
  if (risk_level) predFilter.risk_level = risk_level;
  if (batch_job_id) predFilter.batch_job_id = batch_job_id;
  if (Object.keys(predFilter).length > 0) {
    where.predictions = { some: predFilter };
  }

  const [containers, total] = await Promise.all([
    prisma.container.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        predictions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            risk_score: true,
            risk_level: true,
            explanation_summary: true,
            created_at: true,
          },
        },
      },
    }),
    prisma.container.count({ where }),
  ]);

  // Flatten latest prediction onto container
  const result = containers.map((c) => ({
    ...c,
    latest_prediction: c.predictions[0] || null,
    predictions: undefined,
  }));

  return {
    containers: result,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getContainerById(id, userId, isAdmin) {
  const ownerCond = (!isAdmin && userId)
    ? [{ OR: [{ uploaded_by: userId }, { uploaded_by: null }] }]
    : [];
  const container = await prisma.container.findFirst({
    where: { AND: [{ OR: [{ id }, { container_id: id }] }, ...ownerCond] },
    include: {
      predictions: {
        orderBy: { created_at: 'desc' },
        take: 1,
      },
      uploader: {
        select: { id: true, name: true, email: true },
      },
    },
  });
  return container;
}

async function createContainer(data, uploadedById) {
  return prisma.container.create({
    data: {
      ...data,
      source: 'API',
      uploaded_by: uploadedById || undefined,
    },
  });
}

/**
 * Bulk upsert containers from CSV upload.
 * Uses "upsert" to avoid duplicate errors on re-upload.
 * @param {Array} containers - Parsed container rows
 * @param {string} uploadedById - User ID
 * @returns {Promise<{ created: number, updated: number, errors: Array }>}
 */
async function bulkUpsertContainers(containers, uploadedById) {
  let created = 0;
  let updated = 0;
  const errors = [];

  // Process in batches of 100 for efficiency
  const BATCH_SIZE = 100;
  for (let i = 0; i < containers.length; i += BATCH_SIZE) {
    const batch = containers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        try {
          const existing = await prisma.container.findUnique({
            where: { container_id: row.container_id },
          });

          if (existing) {
            await prisma.container.update({
              where: { container_id: row.container_id },
              data: { ...row, source: 'UPLOAD', uploaded_by: uploadedById },
            });
            updated++;
          } else {
            await prisma.container.create({
              data: { ...row, source: 'UPLOAD', uploaded_by: uploadedById },
            });
            created++;
          }
        } catch (err) {
          logger.warn('Container upsert failed', { container_id: row.container_id, error: err.message });
          errors.push({ container_id: row.container_id, reason: err.message });
        }
      })
    );
  }

  logger.info('Bulk upsert complete', { created, updated, errors: errors.length });
  return { created, updated, errors };
}

async function updateContainer(id, data, userId, isAdmin) {
  // Allow lookup by DB UUID or container_id string
  const ownerCond = (!isAdmin && userId)
    ? [{ OR: [{ uploaded_by: userId }, { uploaded_by: null }] }]
    : [];
  const existing = await prisma.container.findFirst({
    where: { AND: [{ OR: [{ id }, { container_id: id }] }, { deleted_at: null }, ...ownerCond] },
  });
  if (!existing) return null;

  return prisma.container.update({
    where: { id: existing.id },
    data,
  });
}

async function softDeleteContainer(id, deletedBy) {
  return prisma.container.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
}

module.exports = { listContainers, getContainerById, createContainer, updateContainer, bulkUpsertContainers, softDeleteContainer };
