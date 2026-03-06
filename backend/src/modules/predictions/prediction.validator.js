const { z } = require('zod');

const singlePredictSchema = z.object({
  container_id: z.string().min(1, 'container_id is required'),
});

const batchPredictSchema = z.object({
  container_ids: z.array(z.string().min(1)).min(1, 'At least one container_id required').max(5000),
  job_name: z.string().optional(),
});

const listPredictionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  risk_level: z.enum(['CLEAR', 'LOW_RISK', 'CRITICAL']).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_mock: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

module.exports = { singlePredictSchema, batchPredictSchema, listPredictionsQuerySchema };
