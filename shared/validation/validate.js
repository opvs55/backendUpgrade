// shared/validation/validate.js
import { AppError } from '../http/AppError.js';
import { ERROR_CODES } from '../http/errorCodes.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(
      new AppError('Payload inválido.', {
        code: ERROR_CODES.VALIDATION_ERROR,
        status: 400,
        details: result.error.issues,
      })
    );
  }

  req[source] = result.data;
  return next();
};
