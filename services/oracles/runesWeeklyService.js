import {
  getOracleWeeklyModule,
  saveOracleWeeklyModule,
  updateOracleWeeklyModuleById,
} from '../../repositories/oracleWeeklyModuleRepository.js';
import { getIsoWeekInfo } from '../../utils/week.js';
import { generateRunesReadingData } from '../../modules/oracles/runes.controller.js';

const ORACLE_TYPE = 'runes_weekly';

const buildStubReading = ({ question, weekRef }) => ({
  headline: 'Runas da semana',
  summary: 'Semana de revisão e direcionamento gradual. Observe sinais simples e aja com constância.',
  themes: ['clareza', 'ritmo', 'disciplina'],
  recommended_actions: [
    'Defina uma prioridade para a semana.',
    'Revise decisões abertas antes de iniciar algo novo.',
    'Escolha um hábito pequeno e mantenha por 7 dias.',
  ],
  disclaimer: 'Conteúdo para autoconhecimento e reflexão pessoal.',
  metadata: { question: question || null, week_ref: weekRef, stub: true, todo: 'Evoluir heurística semanal de runas.' },
});

export const generateRunesWeekly = async (userId, input = {}, accessToken) => {
  const { weekStart, weekRef } = getIsoWeekInfo();
  const forceRegenerate = Boolean(input.force_regenerate);

  const existing = await getOracleWeeklyModule(userId, weekStart, ORACLE_TYPE, accessToken);
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
    const generated = await generateRunesReadingData({
      question: input.question || 'Direcionamento semanal',
      drawCount: 3,
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
      ? await updateOracleWeeklyModuleById(existing.id, payload, accessToken)
      : await saveOracleWeeklyModule(payload, accessToken);

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
      error_message: error?.message || 'Falha ao gerar runas semanais.',
    };

    const saved = existing
      ? await updateOracleWeeklyModuleById(existing.id, payload, accessToken)
      : await saveOracleWeeklyModule(payload, accessToken);

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
