// shared/http/AppError.js
import { ERROR_CODES } from './errorCodes.js';

export class AppError extends Error {
  constructor(message, { code = ERROR_CODES.INTERNAL_ERROR, status = 500, details = [] } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
