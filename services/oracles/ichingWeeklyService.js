import {
  getOracleWeeklyModule,
  saveOracleWeeklyModule,
  updateOracleWeeklyModuleById,
} from '../../repositories/oracleWeeklyModuleRepository.js';
import { getIsoWeekInfo } from '../../utils/week.js';
import { generateIchingReadingData } from '../../modules/oracles/iching.controller.js';

const ORACLE_TYPE = 'iching_weekly';

const buildStubReading = ({ question, weekRef }) => ({
  headline: 'I Ching da semana',
  summary: 'Momento de equilíbrio entre firmeza e adaptação. Ajustes pequenos trarão estabilidade.',
  themes: ['adaptação', 'foco', 'equilíbrio'],
  recommended_actions: [
    'Observe padrões repetidos antes de decidir.',
    'Aja com moderação em conversas sensíveis.',
    'Consolide o que já começou antes de expandir.',
  ],
  disclaimer: 'Conteúdo para autoconhecimento e reflexão pessoal.',
  metadata: { question: question || null, week_ref: weekRef, stub: true, todo: 'Evoluir heurística semanal de I Ching.' },
});

export const generateIchingWeekly = async (userId, input = {}) => {
  const { weekStart, weekRef } = getIsoWeekInfo();
  const forceRegenerate = Boolean(input.force_regenerate);

  const existing = await getOracleWeeklyModule(userId, weekStart, ORACLE_TYPE);
  if (existing && !forceRegenerate) {
    return {
      week_start: weekStart,
      week_ref: weekRef,
      cached: true,
      oracle_type: ORACLE_TYPE,
      module: existing,
      output: existing.output_payload,
    };
  }

  const inputPayload = { question: input.question || null, week_ref: weekRef };

  try {
    const generated = await generateIchingReadingData({
      question: input.question || 'Direcionamento semanal',
      method: 'weekly',
      week_ref: weekRef,
    });

    const payload = {
      user_id: userId,
      week_start: weekStart,
      oracle_type: ORACLE_TYPE,
      input_payload: inputPayload,
      output_payload: generated,
      status: 'ok',
      error_message: null,
    };

    const saved = existing
      ? await updateOracleWeeklyModuleById(existing.id, payload)
      : await saveOracleWeeklyModule(payload);

    return {
      week_start: weekStart,
      week_ref: weekRef,
      cached: false,
      oracle_type: ORACLE_TYPE,
      module: saved,
      output: generated,
    };
  } catch (error) {
    const fallback = buildStubReading({ question: input.question, weekRef });
    const payload = {
      user_id: userId,
      week_start: weekStart,
      oracle_type: ORACLE_TYPE,
      input_payload: inputPayload,
      output_payload: fallback,
      status: 'error',
      error_message: error?.message || 'Falha ao gerar I Ching semanal.',
    };

    const saved = existing
      ? await updateOracleWeeklyModuleById(existing.id, payload)
      : await saveOracleWeeklyModule(payload);

    return {
      week_start: weekStart,
      week_ref: weekRef,
      cached: false,
      oracle_type: ORACLE_TYPE,
      module: saved,
      output: fallback,
    };
  }
};
