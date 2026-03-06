const { z } = require('zod');

const containerBodySchema = z.object({
  container_id: z.string().trim().min(1),
  declaration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  declaration_time: z.string().optional().default('00:00:00'),
  trade_regime: z.string()
    .transform(v => { const m = {import:'Import',export:'Export',transit:'Transit'}; return m[v.toLowerCase()] ?? v; })
    .pipe(z.enum(['Import', 'Export', 'Transit']))
    .default('Import'),
  origin_country: z.string().min(2).max(3),
  destination_port: z.string().optional().default(''),
  destination_country: z.string().min(2).max(3),
  hs_code: z.string().min(1),
  importer_id: z.string().min(1),
  exporter_id: z.string().min(1),
  declared_value: z.coerce.number().nonnegative(),
  declared_weight: z.coerce.number().positive(),
  measured_weight: z.coerce.number().nonnegative(),
  shipping_line: z.string().optional().default(''),
  dwell_time_hours: z.coerce.number().nonnegative(),
});

const containerQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  origin_country: z.string().optional(),
  risk_level: z.enum(['CLEAR', 'LOW_RISK', 'CRITICAL']).optional(),
  trade_regime: z.enum(['Import', 'Export', 'Transit']).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  batch_job_id: z.string().uuid().optional(),
});

const updateContainerSchema = containerBodySchema.partial();

module.exports = { containerBodySchema, containerQuerySchema, updateContainerSchema };
