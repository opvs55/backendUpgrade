import { resolveNumerologyContext } from '../services/numerology/numerologyContext.js';
import {
  fetchOrCreatePersonalNumerology,
  deletePersonalNumerology,
  fetchOrCreateWeeklyNumerology,
} from '../services/numerology/numerology.service.js';
import { logger } from '../shared/logging/logger.js';

export const getOrCalculateNumerology = async (req, res) => {
  try {
    const ctx = await resolveNumerologyContext(req);
    if (!ctx.ok) {
      logger.warn('numerology.context_failed', { message: ctx.message, requestId: req.requestId });
      return res.status(ctx.status).json({ error: ctx.message });
    }

    const { userId, supabase } = ctx;
    const birthDate = req.body?.birthDate;

    const result = await fetchOrCreatePersonalNumerology({ userId, supabase, birthDate });
    return res.status(result.status).json(result.body);
  } catch (error) {
    logger.error('numerology.personal.unhandled', {
      error: error.message,
      requestId: req.requestId,
    });
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
    }
    return res.status(500).json({ error: error.message || 'Falha interna ao processar numerologia.' });
  }
};

export const resetNumerologyReading = async (req, res) => {
  try {
    const ctx = await resolveNumerologyContext(req);
    if (!ctx.ok) {
      return res.status(ctx.status).json({ error: ctx.message });
    }

    const result = await deletePersonalNumerology({ userId: ctx.userId, supabase: ctx.supabase });
    return res.status(result.status).json(result.body);
  } catch (error) {
    logger.error('numerology.reset.unhandled', { error: error.message, requestId: req.requestId });
    return res.status(500).json({ error: error.message || 'Falha ao resetar.' });
  }
};

export const getOrCalculateWeeklyNumerology = async (req, res) => {
  try {
    const ctx = await resolveNumerologyContext(req);
    if (!ctx.ok) {
      return res.status(ctx.status).json({ error: ctx.message });
    }

    const { userId, supabase, token } = ctx;
    const { birthDate, weekStart } = req.body;

    const result = await fetchOrCreateWeeklyNumerology({
      userId,
      supabase,
      token,
      birthDate,
      weekStart,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    logger.error('numerology.weekly.unhandled', { error: error.message, requestId: req.requestId });
    if (error?.code === 'LLM_LOCATION_UNSUPPORTED') {
      return res.status(503).json({ error: 'Serviço de IA indisponível na localização configurada.' });
    }
    return res.status(500).json({ error: error.message || 'Falha ao gerar numerologia semanal.' });
  }
};
