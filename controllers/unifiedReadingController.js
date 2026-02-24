import { sendSuccess } from '../shared/http/response.js';
import { AppError } from '../shared/http/AppError.js';
import { ERROR_CODES } from '../shared/http/errorCodes.js';
import { getMyUnifiedReadingById, listMyUnifiedReadings } from '../services/unified/unifiedReadingService.js';

export const listUnifiedReadingsMe = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const offset = Number(req.query.offset || 0);
    const data = await listMyUnifiedReadings(req.user.id, { limit, offset });
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};

export const getUnifiedReadingByIdMe = async (req, res, next) => {
  try {
    const data = await getMyUnifiedReadingById(req.user.id, req.params.id);
    if (!data) {
      throw new AppError('Leitura não encontrada.', { code: ERROR_CODES.NOT_FOUND, status: 404 });
    }
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};
