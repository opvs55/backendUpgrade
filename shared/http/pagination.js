import { AppError } from './AppError.js';
import { ERROR_CODES } from './errorCodes.js';

const parseInteger = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return Number(value);
};

export const parsePagination = (
  query = {},
  { defaultLimit = 20, maxLimit = 100 } = {}
) => {
  const parsedLimit = parseInteger(query.limit, defaultLimit);
  const parsedOffset = parseInteger(query.offset, 0);

  const isLimitValid = Number.isInteger(parsedLimit) && parsedLimit > 0;
  const isOffsetValid = Number.isInteger(parsedOffset) && parsedOffset >= 0;

  if (!isLimitValid || !isOffsetValid) {
    throw new AppError('Parâmetros de paginação inválidos.', {
      code: ERROR_CODES.VALIDATION_ERROR,
      status: 400,
      details: [
        {
          path: ['query'],
          message: 'Use limit inteiro > 0 e offset inteiro >= 0.',
        },
      ],
    });
  }

  return {
    limit: Math.min(parsedLimit, maxLimit),
    offset: parsedOffset,
  };
};
