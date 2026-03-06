const jobService = require('./job.service');
const { success, notFound } = require('../../utils/response');
const { predictionsToCSV } = require('../../utils/csv.parser');

async function listJobs(req, res) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const result = await jobService.listJobs(req.user.userId, page, limit);
  return success(res, result);
}

async function getJob(req, res) {
  const job = await jobService.getJobById(req.params.id, req.user.userId);
  if (!job) return notFound(res, 'Batch job');
  return success(res, { job });
}

async function cancelJob(req, res) {
  const job = await jobService.cancelJob(req.params.id, req.user.userId);
  if (!job) return notFound(res, 'Batch job');
  return success(res, { job });
}

async function getJobResults(req, res) {
  const result = await jobService.getJobResults(req.params.id, req.user.userId);
  if (!result) return notFound(res, 'Batch job');

  const csv = predictionsToCSV(result.predictions);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="job_${req.params.id}_results.csv"`);
  return res.send(csv);
}

module.exports = { listJobs, getJob, cancelJob, getJobResults };
