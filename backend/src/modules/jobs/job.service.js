const prisma = require('../../config/db');
const { getPredictionQueue } = require('../../config/bullmq');
const logger = require('../../utils/logger');

async function listJobs(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    prisma.batchJob.findMany({
      where: { created_by: userId },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.batchJob.count({ where: { created_by: userId } }),
  ]);
  return { jobs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getJobById(jobId, userId) {
  const job = await prisma.batchJob.findFirst({
    where: { id: jobId, created_by: userId },
  });
  if (!job) return null;

  const progress_pct = job.total_containers > 0
    ? Math.round(((job.processed_count + job.failed_count) / job.total_containers) * 1000) / 10
    : 0;

  // Risk breakdown from predictions belonging to this job
  const breakdown = await prisma.prediction.groupBy({
    by: ['risk_level'],
    where: { batch_job_id: jobId },
    _count: { risk_level: true },
  });
  const risk_breakdown = { CRITICAL: 0, LOW_RISK: 0, CLEAR: 0 };
  breakdown.forEach(b => { risk_breakdown[b.risk_level] = b._count.risk_level; });

  return { ...job, progress_pct, risk_breakdown };
}

async function cancelJob(jobId, userId) {
  const job = await prisma.batchJob.findFirst({
    where: { id: jobId, created_by: userId },
  });
  if (!job) return null;

  if (job.status === 'COMPLETED' || job.status === 'FAILED') {
    const err = new Error(`Job cannot be cancelled — it is already ${job.status.toLowerCase()}`);
    err.statusCode = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  // Remove all waiting jobs from the BullMQ queue that belong to this batch
  try {
    const queue = getPredictionQueue();
    const waiting = await queue.getJobs(['waiting', 'delayed']);
    const toRemove = waiting.filter((j) => j.data?.batchJobId === jobId);
    await Promise.all(toRemove.map((j) => j.remove()));
    logger.info('BullMQ jobs removed for cancelled batch', { batchJobId: jobId, count: toRemove.length });
  } catch (err) {
    logger.warn('Could not remove BullMQ jobs for cancelled batch', { error: err.message });
  }

  return prisma.batchJob.update({
    where: { id: jobId },
    data: { status: 'FAILED', completed_at: new Date() },
  });
}

async function deleteJob(jobId, userId) {
  const job = await prisma.batchJob.findFirst({
    where: { id: jobId, created_by: userId },
  });
  if (!job) return null;

  if (['QUEUED', 'PROCESSING'].includes(job.status)) {
    const err = new Error('Cannot delete an active job — cancel it first.');
    err.statusCode = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  // Get container IDs whose latest prediction belongs to this batch job
  const jobPredictions = await prisma.prediction.findMany({
    where: { batch_job_id: jobId },
    select: { container_id: true },
  });
  const containerIds = jobPredictions.map((p) => p.container_id);

  // Hard-delete containers scored by this job (CASCADE removes their predictions)
  if (containerIds.length > 0) {
    await prisma.container.deleteMany({ where: { id: { in: containerIds } } });
  }

  // Delete the batch job record (remaining predictions with SetNull are already gone via cascade)
  await prisma.batchJob.delete({ where: { id: jobId } });

  logger.info('Batch job deleted with container cascade', { jobId, userId, containersRemoved: containerIds.length });
  return { deleted: true, containers_removed: containerIds.length };
}

async function getJobResults(jobId, userId) {
  const job = await prisma.batchJob.findFirst({
    where: { id: jobId, created_by: userId },
  });
  if (!job) return null;

  const predictions = await prisma.prediction.findMany({
    where: { batch_job_id: jobId },
    orderBy: { created_at: 'asc' },
    include: { container: { select: { container_id: true } } },
  });

  return { job, predictions };
}

module.exports = { listJobs, getJobById, cancelJob, deleteJob, getJobResults };
