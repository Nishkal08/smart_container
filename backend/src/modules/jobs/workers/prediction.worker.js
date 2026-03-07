const { Worker } = require('bullmq');
const { createBullMQConnection, getRedisClient } = require('../../../config/redis');
const { PREDICTION_QUEUE_NAME } = require('../../../config/bullmq');
const { predictSingle } = require('../../../utils/apiClient');
const prisma = require('../../../config/db');
const logger = require('../../../utils/logger');

// Publish socket events via Redis pub/sub so the backend service
// (which owns Socket.IO) can relay them — works from both the in-process
// worker (app.js) and the standalone worker service (worker.js).
function publishSocketEvent(channel, jobId, data) {
  try {
    getRedisClient().publish(channel, JSON.stringify({ jobId, data }));
  } catch (e) {
    logger.warn('Socket event publish failed', { channel, error: e.message });
  }
}

/**
 * Process a single container: call ML service, persist prediction, update batch counters.
 * Returns { success: true } or { success: false, error }.
 */
async function processContainer({ dbContainerId, containerIdStr, batchJobId }) {
  try {
    const container = await prisma.container.findUnique({ where: { id: dbContainerId } });
    if (!container) throw new Error(`Container ${containerIdStr} not found`);

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

    await prisma.prediction.upsert({
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
        batch_job_id: batchJobId || null,
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
        batch_job_id: batchJobId || null,
      },
    });

    return { success: true, risk_level: mlResult.risk_level };
  } catch (err) {
    logger.warn('Container prediction failed', { containerIdStr, error: err.message });
    return { success: false, error: err.message };
  }
}

const worker = new Worker(
  PREDICTION_QUEUE_NAME,
  async (job) => {
    // Each BullMQ job carries a CHUNK of containers (up to 50).
    const { containers, batchJobId, chunkIndex } = job.data;

    logger.info('Processing prediction chunk', {
      batchJobId, chunkIndex, size: containers.length,
    });

    // Mark job as PROCESSING on first chunk
    if (chunkIndex === 0) {
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { status: 'PROCESSING' },
      }).catch(() => {});
    }

    let chunkProcessed = 0;
    let chunkFailed = 0;

    // Process containers in this chunk sequentially to keep DB connections low
    for (const c of containers) {
      const result = await processContainer({ ...c, batchJobId });
      if (result.success) chunkProcessed++;
      else chunkFailed++;
    }

    // Atomically update batch job counters
    const updatedJob = await prisma.batchJob.update({
      where: { id: batchJobId },
      data: {
        processed_count: { increment: chunkProcessed },
        failed_count: { increment: chunkFailed },
      },
    });

    const pct = (updatedJob.processed_count / updatedJob.total_containers) * 100;
    publishSocketEvent('socket:job:progress', batchJobId, {
      processed: updatedJob.processed_count,
      total: updatedJob.total_containers,
      pct: Math.round(pct * 10) / 10,
      status: 'PROCESSING',
    });

    // Check if all chunks are done
    if (updatedJob.processed_count + updatedJob.failed_count >= updatedJob.total_containers) {
      const finalStatus = updatedJob.failed_count === updatedJob.total_containers ? 'FAILED' : 'COMPLETED';
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { status: finalStatus, completed_at: new Date() },
      });
      if (finalStatus === 'FAILED') {
        publishSocketEvent('socket:job:failed', batchJobId, { error: 'All prediction tasks failed' });
      } else {
        publishSocketEvent('socket:job:completed', batchJobId, {
          total: updatedJob.total_containers,
          failed_count: updatedJob.failed_count,
          completed_at: new Date().toISOString(),
        });
      }
      logger.info('Batch job finished', { batchJobId, finalStatus });
    }

    return { chunkIndex, chunkProcessed, chunkFailed };
  },
  {
    connection: createBullMQConnection(),
    // concurrency=3: 3 chunks × 50 containers = 150 in-flight, sequential DB queries per chunk
    concurrency: 3,
  }
);

worker.on('failed', (job, err) => {
  logger.error('Prediction chunk job failed', {
    jobId: job?.id,
    batchJobId: job?.data?.batchJobId,
    chunkIndex: job?.data?.chunkIndex,
    error: err.message,
  });
});

worker.on('error', (err) => {
  logger.error('BullMQ worker error', { error: err.message });
});

logger.info('Prediction worker initialized', {
  queue: PREDICTION_QUEUE_NAME,
  concurrency: 3,
  chunkSize: 50,
});

module.exports = worker;

const worker = new Worker(
  PREDICTION_QUEUE_NAME,
  async (job) => {
    const { dbContainerId, containerIdStr, batchJobId } = job.data;

    // Fetch container from DB
    const container = await prisma.container.findUnique({
      where: { id: dbContainerId },
    });

    if (!container) {
      throw new Error(`Container ${containerIdStr} not found in database`);
    }

    // Call ML service
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
    await prisma.prediction.upsert({
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
        batch_job_id: batchJobId || null,
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
        batch_job_id: batchJobId || null,
      },
    });

    // Update batch job progress
    if (batchJobId) {
      const updatedJob = await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { processed_count: { increment: 1 }, status: 'PROCESSING' },
      });

      const pct = (updatedJob.processed_count / updatedJob.total_containers) * 100;

      // Emit real-time progress via Redis pub/sub → Socket.IO bridge
      publishSocketEvent('socket:job:progress', batchJobId, {
        processed: updatedJob.processed_count,
        total: updatedJob.total_containers,
        pct: Math.round(pct * 10) / 10,
        status: 'PROCESSING',
      });

      // Check if all done
      if (updatedJob.processed_count + updatedJob.failed_count >= updatedJob.total_containers) {
        await prisma.batchJob.update({
          where: { id: batchJobId },
          data: { status: 'COMPLETED', completed_at: new Date() },
        });
        publishSocketEvent('socket:job:completed', batchJobId, {
          total: updatedJob.total_containers,
          failed_count: updatedJob.failed_count,
          completed_at: new Date().toISOString(),
        });
        logger.info('Batch job completed', { batchJobId });
      }
    }

    return { container_id: containerIdStr, risk_level: mlResult.risk_level };
  },
  {
    connection: createBullMQConnection(),
    concurrency: 10, // Process up to 10 containers in parallel per worker
  }
);

worker.on('failed', async (job, err) => {
  logger.error('Prediction job failed', {
    jobId: job?.id,
    container_id: job?.data?.containerIdStr,
    error: err.message,
  });

  const { batchJobId } = job?.data || {};
  if (batchJobId) {
    const updatedJob = await prisma.batchJob.update({
      where: { id: batchJobId },
      data: { failed_count: { increment: 1 } },
    });

    // Check if all done (including failed)
    if (updatedJob.processed_count + updatedJob.failed_count >= updatedJob.total_containers) {
      const finalStatus = updatedJob.failed_count === updatedJob.total_containers ? 'FAILED' : 'COMPLETED';
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { status: finalStatus, completed_at: new Date() },
      });

      if (finalStatus === 'FAILED') {
        publishSocketEvent('socket:job:failed', batchJobId, { error: 'All prediction tasks failed' });
      } else {
        publishSocketEvent('socket:job:completed', batchJobId, {
          total: updatedJob.total_containers,
          failed_count: updatedJob.failed_count,
          completed_at: new Date().toISOString(),
        });
      }
    }
  }
});

worker.on('error', (err) => {
  logger.error('BullMQ worker error', { error: err.message });
});

logger.info('Prediction worker initialized', { queue: PREDICTION_QUEUE_NAME, concurrency: 10 });

module.exports = worker;
