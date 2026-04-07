// shared/errors/appError.js
// Camada de compatibilidade para imports legados.
import { AppError } from '../http/AppError.js';
import { ERROR_CODES } from '../http/errorCodes.js';

export { AppError, ERROR_CODES };

export const isAppError = (error) => error instanceof AppError;
