// modules/unified/unified.controller.js
import { createUnifiedReading, getUnifiedReadingById } from './unified.service.js';
import { sendSuccess } from '../../shared/http/response.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';

export const createUnifiedReadingHandler = async (req, res, next) => {
  try {
    const unified = await createUnifiedReading({ payload: req.body });
    const status = unified.warnings.length > 0 ? 200 : 200;
    return sendSuccess(res, {
      data: {
        id: unified.id,
        ...unified.result,
      },
      requestId: req.requestId,
      status,
      warnings: unified.warnings,
    });
  } catch (error) {
    return next(error);
  }
};

export const getUnifiedReadingHandler = async (req, res, next) => {
  try {
    const record = await getUnifiedReadingById(req.params.id);
    if (!record) {
      throw new AppError('Leitura não encontrada.', {
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
      });
    }

    return sendSuccess(res, {
      data: {
        id: record.id,
        ...record.result,
      },
      requestId: req.requestId,
      status: 200,
      warnings: record.warnings || [],
    });
  } catch (error) {
    return next(error);
  }
};
