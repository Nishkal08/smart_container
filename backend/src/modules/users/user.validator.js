const { z } = require('zod');

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']).optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']).optional(),
  is_active: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

module.exports = { listUsersQuerySchema, updateUserSchema };
