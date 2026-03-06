const prisma = require('../../config/db');
const { predictSingle } = require('../../utils/apiClient');
const { getPredictionQueue } = require('../../config/bullmq');
const logger = require('../../utils/logger');

/**
 * Predict a single container and persist the result.
 */
async function predictContainer(containerId) {
  // Resolve container by DB UUID or by container_id string
  const container = await prisma.container.findFirst({
    where: {
      OR: [{ id: containerId }, { container_id: containerId }],
      deleted_at: null,
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
      model_version: mlResult.model_version || 'mock-v1.0',
      is_mock: mlResult.is_mock ?? true,
    },
  });

  return { ...prediction, container };
}

/**
 * Queue a batch prediction job.
 * Returns the created batch_job record.
 */
async function queueBatchPrediction({ container_ids, job_name, createdBy }) {
  // Validate that requested container IDs exist
  const containers = await prisma.container.findMany({
    where: {
      OR: [
        { id: { in: container_ids } },
        { container_id: { in: container_ids } },
      ],
      deleted_at: null,
    },
    select: { id: true, container_id: true },
  });

  if (containers.length === 0) {
    const err = new Error('No valid containers found for the provided IDs');
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

  // Enqueue individual prediction tasks
  const queue = getPredictionQueue();
  const jobs = containers.map((c) => ({
    name: 'predict-container',
    data: {
      dbContainerId: c.id,
      containerIdStr: c.container_id,
      batchJobId: batchJob.id,
    },
  }));

  await queue.addBulk(jobs);

  logger.info('Batch job queued', { batchJobId: batchJob.id, total: containers.length });
  return batchJob;
}

async function listPredictions({ page, limit, risk_level, date_from, date_to, is_mock, search }) {
  const skip = (page - 1) * limit;
  const where = {};

  if (risk_level) where.risk_level = risk_level;
  if (is_mock !== undefined) where.is_mock = is_mock === 'true';
  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at.gte = new Date(date_from);
    if (date_to) where.created_at.lte = new Date(date_to + 'T23:59:59Z');
  }
  if (search) {
    where.container = {
      OR: [
        { container_id: { contains: search, mode: 'insensitive' } },
        { importer_id: { contains: search, mode: 'insensitive' } },
        { exporter_id: { contains: search, mode: 'insensitive' } },
      ],
    };
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

async function getPredictionByContainerId(containerId) {
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

async function getAllPredictionsForExport({ risk_level, date_from, date_to }) {
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

async function reScoreContainer(containerId) {
  // Resolve container
  const container = await prisma.container.findFirst({
    where: {
      OR: [{ id: containerId }, { container_id: containerId }],
      deleted_at: null,
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
      model_version: mlResult.model_version || 'mock-v1.0',
      is_mock: mlResult.is_mock ?? true,
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
      model_version: mlResult.model_version || 'mock-v1.0',
      is_mock: mlResult.is_mock ?? true,
    },
  });

  return { ...prediction, container };
}

module.exports = {
  predictContainer,
  reScoreContainer,
  queueBatchPrediction,
  listPredictions,
  getPredictionByContainerId,
  getAllPredictionsForExport,
};
