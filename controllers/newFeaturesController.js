import { resolveNumerologyContext } from '../services/numerology/numerologyContext.js';
import { fetchOrCreateDailyOracle } from '../services/oracles/dailyOracleService.js';
import { calculateCompatibility } from '../services/numerology/compatibilityService.js';
import { fetchOrCreateTransit } from '../services/numerology/transitsService.js';
import { createActiveIchingReading, getIchingActiveHistory } from '../services/oracles/ichingActiveService.js';
import { fetchOrCreateYearMap } from '../services/tarot/yearMapService.js';
import { generateWeeklyCardMessage } from '../services/oracles/weeklyCardMessageService.js';
import { logger } from '../shared/logging/logger.js';

const resolveCtx = async (req, res) => {
  const ctx = await resolveNumerologyContext(req);
  if (!ctx.ok) {
    res.status(ctx.status).json({ error: ctx.message });
    return null;
  }
  return ctx;
};

export const getDailyOracle = async (req, res) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const { oracleDate } = req.query;
    const result = await fetchOrCreateDailyOracle({ userId: ctx.userId, supabase: ctx.supabase, oracleDate });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error('daily_oracle.unhandled', { error: err.message });
    return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
  }
};

export const getCompatibility = async (req, res) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const { name1, birthDate1, name2, birthDate2 } = req.body;
    if (!name1 || !birthDate1 || !name2 || !birthDate2) {
      return res.status(400).json({ error: 'Forneça name1, birthDate1, name2 e birthDate2.' });
    }
    const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormat.test(birthDate1) || !dateFormat.test(birthDate2)) {
      return res.status(400).json({ error: 'birthDate1 e birthDate2 devem estar no formato YYYY-MM-DD.' });
    }
    const result = await calculateCompatibility({ userId: ctx.userId, supabase: ctx.supabase, name1, birthDate1, name2, birthDate2 });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error('compatibility.unhandled', { error: err.message });
    return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
  }
};

export const getTransits = async (req, res) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const { birthDate, transitDate } = req.body;
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({ error: 'Forneça birthDate no formato YYYY-MM-DD.' });
    }
    const result = await fetchOrCreateTransit({ userId: ctx.userId, supabase: ctx.supabase, birthDate, transitDate });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error('transits.unhandled', { error: err.message });
    return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
  }
};

export const postIchingActive = async (req, res) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const { question } = req.body;
    if (!question || question.trim().length < 5) {
      return res.status(400).json({ error: 'A pergunta deve ter pelo menos 5 caracteres.' });
    }
    const result = await createActiveIchingReading({ userId: ctx.userId, supabase: ctx.supabase, question: question.trim() });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error('iching_active.unhandled', { error: err.message });
    return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
  }
};

export const getIchingActiveList = async (req, res) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const result = await getIchingActiveHistory({ userId: ctx.userId, supabase: ctx.supabase, limit });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error('iching_active_list.unhandled', { error: err.message });
    return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
  }
};

export const getYearMap = async (req, res) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const year = parseInt(req.query.year) || new Date().getUTCFullYear();
    const result = await fetchOrCreateYearMap({ userId: ctx.userId, supabase: ctx.supabase, year });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error('year_map.unhandled', { error: err.message });
    return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
  }
};

// Mensagem curta da Carta da Semana — endpoint sem estado (não toca no
// banco), só exige login pra manter consistente com o resto das rotas de
// IA. Repassa erro pro errorHandler central em vez de formatar aqui.
export const postWeeklyCardMessage = async (req, res, next) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const { cardName } = req.body;
    if (!cardName || typeof cardName !== 'string') {
      return res.status(400).json({ error: 'Forneça cardName.' });
    }
    const result = await generateWeeklyCardMessage({ cardName });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};
