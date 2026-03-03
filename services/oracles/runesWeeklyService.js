import {
  getWeeklyModule,
  saveOracleWeeklyModule,
  updateOracleWeeklyModuleById,
} from '../../repositories/oracleWeeklyModuleRepository.js';
import { getIsoWeekInfo } from '../../utils/week.js';
import { generateRunesReadingData } from '../../modules/oracles/runes.controller.js';

const ORACLE_TYPE = 'runes_weekly';

const RUNES_CATALOG = [
  { key: 'fehu', name: 'Fehu', meaning: 'Prosperidade, recursos e impulso inicial.' },
  { key: 'uruz', name: 'Uruz', meaning: 'Vitalidade, força e coragem para agir.' },
  { key: 'thurisaz', name: 'Thurisaz', meaning: 'Proteção, cautela e decisão estratégica.' },
  { key: 'ansuz', name: 'Ansuz', meaning: 'Comunicação clara, escuta e orientação.' },
  { key: 'raidho', name: 'Raidho', meaning: 'Movimento, direção e ajustes de rota.' },
  { key: 'kenaz', name: 'Kenaz', meaning: 'Clareza, aprendizado e criatividade aplicada.' },
  { key: 'gebo', name: 'Gebo', meaning: 'Parcerias, troca justa e reciprocidade.' },
  { key: 'wunjo', name: 'Wunjo', meaning: 'Bem-estar, harmonia e conclusão favorável.' },
  { key: 'hagalaz', name: 'Hagalaz', meaning: 'Mudança súbita que pede adaptação.' },
  { key: 'nauthiz', name: 'Nauthiz', meaning: 'Limites, necessidade e foco no essencial.' },
  { key: 'isa', name: 'Isa', meaning: 'Pausa, contenção e observação consciente.' },
  { key: 'jera', name: 'Jera', meaning: 'Colheita, ciclos e resultados do esforço.' },
];

const RUNE_POSITIONS = ['passado', 'presente', 'futuro'];

const buildSeed = (value) => {
  let hash = 0;
  const text = String(value || 'runes-weekly');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildWeeklyRunesSpread = ({ userId, weekRef }) => {
  const pool = [...RUNES_CATALOG];
  let seed = buildSeed(`${userId}:${weekRef}:threeRunes`);

  const runes = RUNE_POSITIONS.map((position) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const selectedIndex = seed % pool.length;
    const [rune] = pool.splice(selectedIndex, 1);
    const reversed = (seed & 1) === 1;
    return {
      position,
      key: rune.key,
      name: rune.name,
      meaning: rune.meaning,
      reversed,
    };
  });

  return { spread: 'threeRunes', runes };
};

const withWeeklySpread = (reading, context) => ({
  ...reading,
  ...buildWeeklyRunesSpread(context),
});

const withUxFields = (reading = {}) => ({
  ...reading,
  one_liner: reading.one_liner || 'Seu próximo avanço nasce de uma escolha firme hoje.',
  ritual: reading.ritual || 'Escolha uma prioridade e escreva o primeiro passo. Reserve 10 minutos por dia para executá-lo sem interrupções. Ao final da semana, revise o que mudou e ajuste com calma.',
  reflection_question: reading.reflection_question || 'Qual ação simples desta semana mais fortalece o caminho que você quer construir?',
});

const buildStubReading = ({ question, weekRef, userId }) => withUxFields({
  spread: 'threeRunes',
  runes: buildWeeklyRunesSpread({ userId, weekRef }).runes,
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

  const existing = await getWeeklyModule(userId, weekStart, ORACLE_TYPE, accessToken);
  if (existing && !forceRegenerate) {
    const normalizedOutput = withUxFields(existing.output_payload || {});

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
    const generated = await generateRunesReadingData({
      question: input.question || 'Direcionamento semanal',
      drawCount: 3,
      week_ref: weekRef,
    });

    const output = withUxFields(withWeeklySpread(generated, { userId, weekRef }));
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
    const fallback = buildStubReading({ question: input.question, weekRef, userId });
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

export const getRunesWeeklyModule = async (userId, accessToken) => {
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
