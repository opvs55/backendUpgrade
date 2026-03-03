import { sendSuccess } from '../shared/http/response.js';
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
    const data = await generateCentralReading(req.user.id, req.body || {}, req.accessToken);
    return sendSuccess(res, { data, requestId: req.requestId });
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
