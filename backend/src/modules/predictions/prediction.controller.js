const predictionService = require('./prediction.service');
const { success, accepted, notFound } = require('../../utils/response');
const { predictionsToCSV } = require('../../utils/csv.parser');

async function predictSingle(req, res) {
  const result = await predictionService.predictContainer(req.body.container_id);
  return success(res, result);
}

async function predictBatch(req, res) {
  const batchJob = await predictionService.queueBatchPrediction({
    container_ids: req.body.container_ids,
    job_name: req.body.job_name,
    createdBy: req.user.userId,
  });
  return accepted(res, {
    batch_job_id: batchJob.id,
    status: batchJob.status,
    total_containers: batchJob.total_containers,
    message: 'Batch prediction queued. Monitor progress via WebSocket or GET /api/v1/jobs/:id',
  });
}

async function listPredictions(req, res) {
  const query = {
    ...req.query,
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 20,
  };
  const result = await predictionService.listPredictions(query);
  return success(res, result);
}

async function getPredictionByContainer(req, res) {
  const prediction = await predictionService.getPredictionByContainerId(req.params.containerId);
  if (!prediction) return notFound(res, 'Prediction');
  return success(res, { prediction });
}

async function exportPredictions(req, res) {
  const predictions = await predictionService.getAllPredictionsForExport(req.query);
  const csv = predictionsToCSV(predictions);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="smart_container_predictions.csv"');
  return res.send(csv);
}

async function reScoreContainer(req, res) {
  const result = await predictionService.reScoreContainer(req.params.containerId);
  return success(res, result);
}

module.exports = { predictSingle, predictBatch, listPredictions, getPredictionByContainer, exportPredictions, reScoreContainer };
