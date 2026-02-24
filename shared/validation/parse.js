// shared/validation/parse.js
import { AppError, ERROR_CODES } from '../errors/appError.js';

export const parseWithSchema = (schema, payload, context = 'payload') => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(`Dados inválidos em ${context}.`, {
      code: ERROR_CODES.VALIDATION_ERROR,
      status: 400,
      details: result.error.flatten(),
    });
  }
  return result.data;
};
