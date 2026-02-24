// shared/errors/llmErrors.js
import { AppError, ERROR_CODES } from './appError.js';

export const mapLlmError = (error) => {
  if (error?.code === ERROR_CODES.LLM_LOCATION_UNSUPPORTED || error?.code === 'LLM_LOCATION_UNSUPPORTED') {
    return new AppError('Serviço de IA indisponível na localização configurada.', {
      code: ERROR_CODES.LLM_LOCATION_UNSUPPORTED,
      status: 503,
    });
  }

  return new AppError('Falha ao acessar o provedor de IA.', {
    code: ERROR_CODES.LLM_PROVIDER_ERROR,
    status: 502,
    details: error?.message,
  });
};
