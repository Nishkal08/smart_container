const prisma = require('../../config/db');
const { predictSingle } = require('../../utils/apiClient');
const { getPredictionQueue } = require('../../config/bullmq');
const logger = require('../../utils/logger');

/**
 * Predict a single container and persist the result.
 */
async function predictContainer(containerId, userId, isAdmin) {
  // Resolve container by DB UUID or by container_id string
  const ownerFilter = (!isAdmin && userId) ? { uploaded_by: userId } : {};
  const container = await prisma.container.findFirst({
    where: {
      OR: [{ id: containerId }, { container_id: containerId }],
      deleted_at: null,
      ...ownerFilter,
    },
  });

  if (!container) {
    const err = new Error('Container not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Call FastAPI ML service
  const mlResult = await predictSingle({
    container_id: container.container_id,
    declared_weight: container.declared_weight,
    measured_weight: container.measured_weight,
    declared_value: container.declared_value,
    dwell_time_hours: container.dwell_time_hours,
    origin_country: container.origin_country,
    hs_code: container.hs_code,
    trade_regime: container.trade_regime,
    importer_id: container.importer_id,
    exporter_id: container.exporter_id,
    shipping_line: container.shipping_line,
    destination_port: container.destination_port,
    destination_country: container.destination_country,
  });

  // Persist prediction
  const prediction = await prisma.prediction.create({
    data: {
      container_id: container.id,
      risk_score: mlResult.risk_score,
      risk_level: mlResult.risk_level,
      explanation_summary: mlResult.explanation_summary,
      anomalies: mlResult.anomalies || [],
      feature_contributions: mlResult.feature_contributions || [],
      weight_discrepancy_pct: mlResult.weight_discrepancy_pct ?? null,
      value_per_kg: mlResult.value_per_kg ?? null,
      model_version: mlResult.model_version || 'xgb-v2.0',
      is_mock: mlResult.is_mock ?? false,
    },
  });

  return { ...prediction, container };
}

/**
 * Queue a batch prediction job.
 * Returns the created batch_job record.
 */
async function queueBatchPrediction({ container_ids, scope, job_name, createdBy, isAdmin }) {
  // All authenticated users can queue any container — shared pool for customs inspection.
  let containers;
  if (scope !== undefined) {
    // Scope-based: backend resolves which containers to process
    const where = { deleted_at: null };
    if (scope !== 'all') {
      where.predictions = { some: { risk_level: scope } };
    }
    containers = await prisma.container.findMany({
      where,
      select: { id: true, container_id: true },
    });
  } else {
    // Legacy: explicit container ID list supplied by caller
    containers = await prisma.container.findMany({
      where: {
        AND: [
          { OR: [{ id: { in: container_ids } }, { container_id: { in: container_ids } }] },
          { deleted_at: null },
        ],
      },
      select: { id: true, container_id: true },
    });
  }

  if (containers.length === 0) {
    const err = new Error('No valid containers found for the selected scope');
    err.statusCode = 422;
    err.code = 'UNPROCESSABLE';
    throw err;
  }

  // Create a BatchJob record
  const batchJob = await prisma.batchJob.create({
    data: {
      name: job_name || `Batch job ${new Date().toISOString()}`,
      status: 'QUEUED',
      total_containers: containers.length,
      processed_count: 0,
      failed_count: 0,
      created_by: createdBy,
    },
  });

  // Enqueue containers in chunks of 50 per BullMQ job.
  // 8500 containers → 170 Redis entries (not 8500) — avoids Redis memory limits.
  const CHUNK_SIZE = 50;
  const chunks = [];
  for (let i = 0; i < containers.length; i += CHUNK_SIZE) {
    chunks.push(containers.slice(i, i + CHUNK_SIZE));
  }

  const queue = getPredictionQueue();
  const jobs = chunks.map((chunk, idx) => ({
    name: 'predict-container-chunk',
    data: {
      containers: chunk.map(c => ({ dbContainerId: c.id, containerIdStr: c.container_id })),
      batchJobId: batchJob.id,
      chunkIndex: idx,
    },
  }));

  // Chunk the addBulk call itself so we never push >500 entries at once to Redis
  for (let i = 0; i < jobs.length; i += 500) {
    await queue.addBulk(jobs.slice(i, i + 500));
  }

  logger.info('Batch job queued', { batchJobId: batchJob.id, total: containers.length });
  return batchJob;
}

async function listPredictions({ page, limit, risk_level, date_from, date_to, is_mock, search, userId, isAdmin }) {
  const skip = (page - 1) * limit;
  const where = {};

  if (risk_level) where.risk_level = risk_level;
  if (is_mock !== undefined) where.is_mock = is_mock === 'true';
  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at.gte = new Date(date_from);
    if (date_to) where.created_at.lte = new Date(date_to + 'T23:59:59Z');
  }

  const containerConditions = [];
  if (!isAdmin && userId) {
    // Show predictions for containers owned by this user OR with no owner (legacy/shared)
    containerConditions.push({ OR: [{ uploaded_by: userId }, { uploaded_by: null }] });
  }
  if (search) {
    containerConditions.push({
      OR: [
        { container_id: { contains: search, mode: 'insensitive' } },
        { importer_id: { contains: search, mode: 'insensitive' } },
        { exporter_id: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (containerConditions.length > 0) {
    where.container = containerConditions.length === 1
      ? containerConditions[0]
      : { AND: containerConditions };
  }

  const [predictions, total] = await Promise.all([
    prisma.prediction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        container: {
          select: {
            container_id: true,
            origin_country: true,
            destination_country: true,
            importer_id: true,
            exporter_id: true,
          },
        },
      },
    }),
    prisma.prediction.count({ where }),
  ]);

  return {
    predictions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getPredictionByContainerId(containerId, userId, isAdmin) {
  return prisma.prediction.findFirst({
    where: {
      container: {
        OR: [{ id: containerId }, { container_id: containerId }],
      },
    },
    orderBy: { created_at: 'desc' },
    include: {
      container: true,
    },
  });
}

async function getAllPredictionsForExport({ risk_level, date_from, date_to, userId, isAdmin }) {
  const where = {};
  if (risk_level) where.risk_level = risk_level;
  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at.gte = new Date(date_from);
    if (date_to) where.created_at.lte = new Date(date_to + 'T23:59:59Z');
  }
  return prisma.prediction.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: { container: { select: { container_id: true } } },
  });
}

async function reScoreContainer(containerId, userId, isAdmin) {
  // Resolve container
  const container = await prisma.container.findFirst({
    where: {
      AND: [{ OR: [{ id: containerId }, { container_id: containerId }] }, { deleted_at: null }],
    },
  });

  if (!container) {
    const err = new Error('Container not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Call FastAPI ML service
  const mlResult = await predictSingle({
    container_id: container.container_id,
    declared_weight: container.declared_weight,
    measured_weight: container.measured_weight,
    declared_value: container.declared_value,
    dwell_time_hours: container.dwell_time_hours,
    origin_country: container.origin_country,
    hs_code: container.hs_code,
    trade_regime: container.trade_regime,
    importer_id: container.importer_id,
    exporter_id: container.exporter_id,
    shipping_line: container.shipping_line,
    destination_port: container.destination_port,
    destination_country: container.destination_country,
  });

  // Upsert — update existing prediction or insert new one
  const prediction = await prisma.prediction.upsert({
    where: { container_id: container.id },
    update: {
      risk_score: mlResult.risk_score,
      risk_level: mlResult.risk_level,
      explanation_summary: mlResult.explanation_summary,
      anomalies: mlResult.anomalies || [],
      feature_contributions: mlResult.feature_contributions || [],
      weight_discrepancy_pct: mlResult.weight_discrepancy_pct ?? null,
      value_per_kg: mlResult.value_per_kg ?? null,
      model_version: mlResult.model_version || 'xgb-v2.0',
      is_mock: mlResult.is_mock ?? false,
    },
    create: {
      container_id: container.id,
      risk_score: mlResult.risk_score,
      risk_level: mlResult.risk_level,
      explanation_summary: mlResult.explanation_summary,
      anomalies: mlResult.anomalies || [],
      feature_contributions: mlResult.feature_contributions || [],
      weight_discrepancy_pct: mlResult.weight_discrepancy_pct ?? null,
      value_per_kg: mlResult.value_per_kg ?? null,
      model_version: mlResult.model_version || 'xgb-v2.0',
      is_mock: mlResult.is_mock ?? false,
    },
  });

  return { ...prediction, container };
}

/**
 * Predict risk from raw container data — no DB lookup, no persistence.
 * Used for ad-hoc "what-if" scoring directly from user-supplied fields.
 */
async function predictRaw(data) {
  const mlResult = await predictSingle({
    container_id: data.container_id,
    declared_weight: data.declared_weight,
    measured_weight: data.measured_weight,
    declared_value: data.declared_value,
    dwell_time_hours: data.dwell_time_hours,
    origin_country: data.origin_country,
    hs_code: data.hs_code,
    trade_regime: data.trade_regime || 'Import',
    importer_id: data.importer_id || '',
    exporter_id: data.exporter_id || '',
    shipping_line: data.shipping_line || '',
    destination_port: data.destination_port || '',
    destination_country: data.destination_country || '',
  });
  return mlResult;
}

module.exports = {
  predictContainer,
  reScoreContainer,
  predictRaw,
  queueBatchPrediction,
  listPredictions,
  getPredictionByContainerId,
  getAllPredictionsForExport,
};
