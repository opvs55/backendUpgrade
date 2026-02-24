// shared/async/withTimeout.js
import { AppError } from '../http/AppError.js';
import { ERROR_CODES } from '../http/errorCodes.js';

export const withTimeout = (promise, ms, moduleName) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new AppError(`Módulo ${moduleName} excedeu timeout; síntese gerada sem este módulo.`, {
            code: ERROR_CODES.MODULE_TIMEOUT,
            status: 504,
          })
        );
      }, ms);
    }),
  ]);
};
