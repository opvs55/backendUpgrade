import {
  getWeeklyModule,
  saveOracleWeeklyModule,
  updateOracleWeeklyModuleById,
} from '../../repositories/oracleWeeklyModuleRepository.js';
import { getIsoWeekInfo } from '../../utils/week.js';
import { generateIchingReadingData } from '../../modules/oracles/iching.controller.js';

const ORACLE_TYPE = 'iching_weekly';

const createSeededRandom = (seedText) => {
  let hash = 2166136261;
  const normalized = String(seedText || 'iching-weekly');

  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6D2B79F5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const generateWeeklyLines = ({ userId, weekRef, question }) => {
  const random = createSeededRandom(`${userId || 'anon'}:${weekRef}:${question || ''}`);
  return Array.from({ length: 6 }, () => (random() >= 0.5 ? 1 : 0));
};

const withUxFields = (reading = {}) => ({
  ...reading,
  one_liner: reading.one_liner || 'Fluir com lucidez hoje evita desgaste amanhã.',
  ritual: reading.ritual || 'Antes de agir, pare por um minuto e observe o contexto real. Escolha uma decisão pequena e consistente com o que você já começou. À noite, anote um ajuste que traga mais equilíbrio para o próximo dia.',
  reflection_question: reading.reflection_question || 'Onde posso ceder com sabedoria sem abrir mão do que é essencial para mim?',
});

const withLines = (reading, context) => withUxFields({
  ...reading,
  lines: Array.isArray(reading?.lines) && reading.lines.length === 6
    ? reading.lines.map((line) => (line ? 1 : 0))
    : generateWeeklyLines(context),
});

const buildStubReading = ({ question, weekRef }) => withUxFields({
  headline: 'I Ching da semana',
  summary: 'Momento de equilíbrio entre firmeza e adaptação. Ajustes pequenos trarão estabilidade.',
  themes: ['adaptação', 'foco', 'equilíbrio'],
  recommended_actions: [
    'Observe padrões repetidos antes de decidir.',
    'Aja com moderação em conversas sensíveis.',
    'Consolide o que já começou antes de expandir.',
  ],
  lines: generateWeeklyLines({ weekRef, question }),
  disclaimer: 'Conteúdo para autoconhecimento e reflexão pessoal.',
  metadata: { question: question || null, week_ref: weekRef, stub: true, todo: 'Evoluir heurística semanal de I Ching.' },
});

export const generateIchingWeekly = async (userId, input = {}, accessToken) => {
  const { weekStart, weekRef } = getIsoWeekInfo();
  const forceRegenerate = Boolean(input.force_regenerate);

  const existing = await getWeeklyModule(userId, weekStart, ORACLE_TYPE, accessToken);
  if (existing && !forceRegenerate) {
    const normalizedOutput = withLines(existing.output_payload || {}, {
      userId,
      weekRef,
      question: existing?.input_payload?.question,
    });

    if (JSON.stringify(normalizedOutput) !== JSON.stringify(existing.output_payload || {})) {
      await updateOracleWeeklyModuleById(existing.id, { output_payload: normalizedOutput }, accessToken);
    }

    return {
      week_start: weekStart,
      week_ref: weekRef,
      cached: true,
      oracle_type: ORACLE_TYPE,
      module: existing,
      output: normalizedOutput,
    };
  }

  const inputPayload = { question: input.question || null, week_ref: weekRef };

  try {
    const generated = await generateIchingReadingData({
      question: input.question || 'Direcionamento semanal',
      method: 'weekly',
      week_ref: weekRef,
    });

    const output = withLines(generated, { userId, weekRef, question: input.question });

    const payload = {
      user_id: userId,
      week_start: weekStart,
      oracle_type: ORACLE_TYPE,
      input_payload: inputPayload,
      output_payload: output,
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
      output,
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


export const getIchingWeeklyModule = async (userId, accessToken) => {
  const { weekStart, weekRef } = getIsoWeekInfo();
  const module = await getWeeklyModule(userId, weekStart, ORACLE_TYPE, accessToken);

  return {
    week_start: weekStart,
    week_ref: weekRef,
    oracle_type: ORACLE_TYPE,
    cached: Boolean(module),
    module: module || null,
  };
};
