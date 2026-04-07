import { sendSuccess } from '../shared/http/response.js';
import { AppError } from '../shared/http/AppError.js';
import { ERROR_CODES } from '../shared/http/errorCodes.js';
import { centralGenerateInputSchema } from '../shared/http/centralReadingContract.js';
import { generateCentralReading, getCentralOracleRequirements } from '../services/oracles/centralOracleService.js';
import { generateRunesWeekly, getRunesWeeklyModule } from '../services/oracles/runesWeeklyService.js';
import { generateIchingWeekly, getIchingWeeklyModule } from '../services/oracles/ichingWeeklyService.js';

export const getCentralRequirements = async (req, res, next) => {
  try {
    const data = await getCentralOracleRequirements(req.user.id, req.accessToken);
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};

export const generateCentralOracle = async (req, res, next) => {
  try {
    const parsed = centralGenerateInputSchema.safeParse(req.body || {});
    if (!parsed.success) {
      throw new AppError('Payload inválido para leitura geral semanal.', {
        code: ERROR_CODES.VALIDATION_ERROR,
        status: 422,
        details: parsed.error.issues,
      });
    }

    const data = await generateCentralReading(req.user.id, parsed.data, req.accessToken);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

export const generateRunesWeeklyOracle = async (req, res, next) => {
  try {
    const data = await generateRunesWeekly(req.user.id, req.body || {}, req.accessToken);
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};

export const generateIchingWeeklyOracle = async (req, res, next) => {
  try {
    const data = await generateIchingWeekly(req.user.id, req.body || {}, req.accessToken);
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};


export const getRunesWeeklyOracle = async (req, res, next) => {
  try {
    const data = await getRunesWeeklyModule(req.user.id, req.accessToken);
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};

export const getIchingWeeklyOracle = async (req, res, next) => {
  try {
    const data = await getIchingWeeklyModule(req.user.id, req.accessToken);
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};
