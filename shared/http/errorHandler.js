// shared/http/errorHandler.js
import { ERROR_CODES } from './errorCodes.js';

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
