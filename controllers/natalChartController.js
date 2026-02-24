import { sendSuccess } from '../shared/http/response.js';
import { fetchMyNatalChart, upsertMyNatalChart } from '../services/natal/natalChartService.js';

export const getMyNatalChart = async (req, res, next) => {
  try {
    const data = await fetchMyNatalChart(req.user.id);
    return sendSuccess(res, { data, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
};

export const upsertNatalChart = async (req, res, next) => {
  try {
    const payload = req.body || {};
    if (!payload.birth_date || !payload.birth_city) {
      return res.status(400).json({ ok: false, error: { message: 'birth_date e birth_city são obrigatórios.' } });
    }
    const data = await upsertMyNatalChart(req.user.id, payload);
    return sendSuccess(res, { data, requestId: req.requestId, status: 201 });
  } catch (error) {
    return next(error);
  }
};
