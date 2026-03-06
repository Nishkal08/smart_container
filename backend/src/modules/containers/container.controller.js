const multer = require('multer');
const path = require('path');
const fs = require('fs');
const containerService = require('./container.service');
const { parseCSVFile } = require('../../utils/csv.parser');
const { success, created, accepted, notFound } = require('../../utils/response');
const envConfig = require('../../config/env');
const logger = require('../../utils/logger');

// Ensure upload directory exists
const uploadDir = path.resolve(envConfig.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const safeBase = `upload_${Date.now()}_${req.user?.userId || 'unknown'}`;
    cb(null, `${safeBase}.csv`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: envConfig.UPLOAD_MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'), false);
    }
  },
}).single('file');

// Wrap multer in a promise for clean async/await usage
function handleUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function listContainers(req, res) {
  const query = {
    ...req.query,
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 20,
    userId: req.user.userId,
    isAdmin: req.user.role === 'ADMIN',
  };
  const result = await containerService.listContainers(query);
  return success(res, result);
}

async function getContainerById(req, res) {
  const container = await containerService.getContainerById(req.params.id, req.user.userId, req.user.role === 'ADMIN');
  if (!container) return notFound(res, 'Container');
  return success(res, { container });
}

async function createContainer(req, res) {
  const container = await containerService.createContainer(req.body, req.user.userId);
  return created(res, { container });
}

async function updateContainer(req, res) {
  const container = await containerService.updateContainer(req.params.id, req.body, req.user.userId, req.user.role === 'ADMIN');
  if (!container) return notFound(res, 'Container');
  return success(res, { container });
}

async function uploadCSV(req, res) {
  await handleUpload(req, res);

  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
  }

  logger.info('CSV upload received', { file: req.file.filename, user: req.user.userId });

  const { containers, errors, skipped } = await parseCSVFile(req.file.path);

  if (containers.length === 0) {
    // Clean up temp file
    fs.unlink(req.file.path, () => {});
    return res.status(422).json({
      success: false,
      error: { code: 'UNPROCESSABLE', message: 'No valid container rows found in CSV', details: errors.slice(0, 10) },
    });
  }

  const result = await containerService.bulkUpsertContainers(containers, req.user.userId);

  // Clean up temp file after processing
  fs.unlink(req.file.path, () => {});

  let batch_job = null;
  if (req.query.predict === 'true' && result.created + result.updated > 0) {
    try {
      const { queueBatchPrediction } = require('../predictions/prediction.service');
      const containerIds = containers.map((c) => c.container_id);
      batch_job = await queueBatchPrediction({
        container_ids: containerIds,
        job_name: `Auto-predict: ${req.file.originalname}`,
        createdBy: req.user.userId,
      });
      logger.info('Auto-predict batch job queued after upload', { batchJobId: batch_job.id });
    } catch (err) {
      logger.warn('Failed to auto-queue batch prediction after upload', { error: err.message });
    }
  }

  return accepted(res, {
    uploaded: result.created + result.updated,
    created: result.created,
    updated: result.updated,
    skipped: skipped + result.errors.length,
    parse_errors: errors.slice(0, 20),
    db_errors: result.errors.slice(0, 20),
    ...(batch_job && { batch_job: { id: batch_job.id, name: batch_job.name, status: batch_job.status } }),
  });
}

async function deleteContainer(req, res) {
  const container = await containerService.getContainerById(req.params.id);
  if (!container) return notFound(res, 'Container');
  await containerService.softDeleteContainer(req.params.id, req.user.userId);
  return success(res, null);
}

module.exports = { listContainers, getContainerById, createContainer, updateContainer, uploadCSV, deleteContainer };
