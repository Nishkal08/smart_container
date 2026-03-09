const { z } = require('zod');

const singlePredictSchema = z.object({
  container_id: z.string().min(1, 'container_id is required'),
});

const batchPredictSchema = z.object({
  container_ids: z.array(z.string().min(1)).min(1).max(5000).optional(),
  scope: z.enum(['all', 'CRITICAL', 'LOW_RISK', 'CLEAR']).optional(),
  job_name: z.string().optional(),
}).refine(
  (d) => d.container_ids !== undefined || d.scope !== undefined,
  { message: 'Either container_ids or scope must be provided' },
);

const listPredictionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  risk_level: z.enum(['CLEAR', 'LOW_RISK', 'CRITICAL']).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_mock: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

const rawPredictSchema = z.object({
  container_id: z.string().min(1, 'container_id is required'),
  declared_weight: z.number().nonnegative('declared_weight must be >= 0'),
  measured_weight: z.number().nonnegative('measured_weight must be >= 0'),
  declared_value: z.number().nonnegative('declared_value must be >= 0'),
  dwell_time_hours: z.number().nonnegative('dwell_time_hours must be >= 0'),
  origin_country: z.string().min(1, 'origin_country is required'),
  hs_code: z.string().min(1, 'hs_code is required'),
  destination_port: z.string().optional().default(''),
  destination_country: z.string().optional().default(''),
  trade_regime: z.string().optional().default('Import'),
  importer_id: z.string().optional().default(''),
  exporter_id: z.string().optional().default(''),
  shipping_line: z.string().optional().default(''),
});

module.exports = { singlePredictSchema, batchPredictSchema, listPredictionsQuerySchema, rawPredictSchema };
