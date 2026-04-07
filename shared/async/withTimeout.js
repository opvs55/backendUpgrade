// shared/async/withTimeout.js
import { AppError } from '../http/AppError.js';
import { ERROR_CODES } from '../http/errorCodes.js';

export const withTimeout = (promise, ms, moduleName) => {
  const timeoutMs = Number(ms);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new AppError('Timeout inválido configurado para módulo assíncrono.', {
      code: ERROR_CODES.INTERNAL_ERROR,
      status: 500,
      details: [{ module: moduleName, timeout_ms: ms }],
    });
  }

  let timerId;

  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timerId) {
        clearTimeout(timerId);
      }
    }),
    new Promise((_, reject) => {
      timerId = setTimeout(() => {
        reject(
          new AppError(`Módulo ${moduleName} excedeu timeout; síntese gerada sem este módulo.`, {
            code: ERROR_CODES.MODULE_TIMEOUT,
            status: 504,
          })
        );
      }, timeoutMs);
    }),
  ]);
};
