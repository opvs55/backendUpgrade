// shared/timeout/withTimeout.js
import { AppError, ERROR_CODES } from '../errors/appError.js';

export const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(
          new AppError(`Timeout no módulo ${label}.`, {
            code: ERROR_CODES.MODULE_TIMEOUT,
            status: 504,
          })
        );
      }, ms);
    }),
  ]);
