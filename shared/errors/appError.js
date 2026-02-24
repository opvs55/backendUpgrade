// shared/errors/appError.js
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MODULE_TIMEOUT: 'MODULE_TIMEOUT',
  MODULE_FAILURE: 'MODULE_FAILURE',
  LLM_PROVIDER_ERROR: 'LLM_PROVIDER_ERROR',
  LLM_LOCATION_UNSUPPORTED: 'LLM_LOCATION_UNSUPPORTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export class AppError extends Error {
  constructor(message, { code = ERROR_CODES.INTERNAL_ERROR, status = 500, details = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const isAppError = (error) => error instanceof AppError;
