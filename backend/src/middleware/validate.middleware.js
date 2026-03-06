const { validationError } = require('../utils/response');

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} target
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return validationError(res, details);
    }
    req[target] = result.data; // Replace with parsed (and coerced) data
    next();
  };
}

module.exports = { validate };
