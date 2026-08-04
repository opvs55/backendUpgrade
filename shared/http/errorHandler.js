// shared/http/errorHandler.js
import { ERROR_CODES } from './errorCodes.js';
import { logger } from '../logging/logger.js';

const mapUnknownError = (error) => {
  if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
    return {
      status: 503,
      code: ERROR_CODES.LLM_LOCATION_UNSUPPORTED,
      message: 'Serviço de IA indisponível na localização configurada.',
      details: [],
    };
  }

  return {
    status: 500,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'Erro interno.',
    details: [],
  };
};

export const errorHandler = (error, req, res, _next) => {
  const mapped = error?.status && error?.code
    ? {
        status: error.status,
        code: error.code,
        message: error.message,
        details: error.details || [],
      }
    : mapUnknownError(error);

  if (mapped.status >= 500) {
    logger.error('unhandled_error', {
      requestId: req.requestId,
      path: req.originalUrl,
      message: error?.message,
      stack: error?.stack,
    });
  }

  return res.status(mapped.status).json({
    ok: false,
    error: {
      code: mapped.code,
      message: mapped.message,
      details: mapped.details,
    },
    meta: {
      requestId: req.requestId,
    },
  });
};
