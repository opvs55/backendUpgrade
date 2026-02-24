import { sendSuccess } from '../shared/http/response.js';
import { generateCentralReading, getCentralOracleRequirements } from '../services/oracles/centralOracleService.js';

export const getCentralRequirements = async (req, res, next) => {
  try {
    const data = await getCentralOracleRequirements(req.user.id);
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};

export const generateCentralOracle = async (req, res, next) => {
  try {
    const data = await generateCentralReading(req.user.id, req.body || {});
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};
