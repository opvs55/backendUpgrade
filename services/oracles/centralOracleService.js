import { getProfileById } from '../../repositories/profileRepository.js';
import { getLatestNumerologyByUserId } from '../../repositories/numerologyRepository.js';
import { getNumerologyWeeklyByUserAndWeekStart } from '../../repositories/numerologyWeeklyRepository.js';
import { getWeeklyCardByUserAndWeekStart } from '../../repositories/weeklyCardRepository.js';
import { getOracleWeeklyModule } from '../../repositories/oracleWeeklyModuleRepository.js';
import {
  getUnifiedReadingByUserAndWeekStart,
  upsertUnifiedReading,
} from '../../repositories/unifiedReadingRepository.js';
import { generateSynthesis } from './synthesisAiService.js';
import { generateRunesWeekly } from './runesWeeklyService.js';
import { generateIchingWeekly } from './ichingWeeklyService.js';
import { getWeekRef, getWeekStartISO } from '../../utils/week.js';
import { logger } from '../../shared/logging/logger.js';

const reduceToDigit = (value) => {
  let current = Number(value) || 0;
  while (current > 9 && ![11, 22, 33].includes(current)) {
    current = String(current)
      .split('')
      .map((digit) => Number(digit))
      .reduce((acc, digit) => acc + digit, 0);
  }
  return current;
};

const buildNumerologyTime = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const yearUniversal = reduceToDigit(year);
  const monthEnergy = reduceToDigit(month + yearUniversal);

  return {
    year_universal: yearUniversal,
    month,
    month_energy: monthEnergy,
    interpretation_notes: `Ano universal ${yearUniversal} somado ao mês ${month} indica vibração ${monthEnergy}, com convite à ação equilibrada e revisão prática de prioridades.`,
  };
};

const mapRequirements = ({ profile, numerologyBase, numerologyWeekly, weeklyCard, runesWeekly, ichingWeekly, weekStart, weekRef }) => {
  const requirementsStatus = {
    has_profile: Boolean(profile),
    has_numerology_base: Boolean(numerologyBase),
    has_numerology_weekly: Boolean(numerologyWeekly),
    has_weekly_tarot_card: Boolean(weeklyCard),
    has_runes_weekly: Boolean(runesWeekly),
    has_iching_weekly: Boolean(ichingWeekly),
  };

  const missingRequirements = Object.entries(requirementsStatus)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  return {
    week_start: weekStart,
    week_ref: weekRef,
    requirements_status: requirementsStatus,
    can_generate_general_reading: true,
    missing_requirements: missingRequirements,
    suggested_actions: [
      { path: '/tarot', label: 'Tirar carta semanal' },
      { path: '/numerologia', label: 'Gerar numerologia base e semanal' },
      { path: '/oraculo/geral', label: 'Gerar leitura geral' },
      { path: '/runas', label: 'Gerar runas semanais' },
      { path: '/iching', label: 'Gerar I Ching semanal' },
    ],
  };
};

const normalizeModulePayload = (moduleRow) => {
  if (!moduleRow) return null;
  if (moduleRow.status && moduleRow.status !== 'ok') return null;
  return moduleRow.output_payload || moduleRow;
};

const SOURCE_KEYS = {
  weeklyCard: 'weekly_cards',
  numerologyWeekly: 'numerology_weekly',
  runesWeekly: 'runes_weekly',
  ichingWeekly: 'iching_weekly',
};

const buildBasicProfile = (profile) => ({
  name: profile?.name || null,
  username: profile?.username || null,
});

const buildFallbackCentralReading = () => ({
  title: 'Oráculo Central da Semana',
  one_liner: 'Siga com foco no essencial e ajustes pequenos, mas consistentes.',
  overview: 'A síntese completa não ficou disponível agora, então esta leitura parcial prioriza estabilidade e clareza prática para a semana.',
  signals: [
    'Revise compromissos e mantenha apenas o que sustenta sua energia.',
    'Dê preferência a decisões simples e objetivas.',
    'Faça uma pausa curta antes de responder temas importantes.',
  ],
  synthesis: 'Mesmo sem todos os detalhes integrados por IA, você ganha força ao combinar presença, organização e ritmo sustentável.',
  practical_guidance: [
    'Escolha uma prioridade central para a semana.',
    'Mantenha um check-in diário rápido de foco e energia.',
    'Finalize pendências antigas antes de iniciar novas frentes.',
  ],
  closing: 'Simplicidade com constância será sua melhor estratégia neste ciclo.',
  tags: ['oraculo-central', 'semana', 'parcial'],
  energy_score: 70,
});

const safeFetch = async ({ userId, weekStart, sourceName, fallbackValue, fetcher }) => {
  try {
    const value = await fetcher();
    const normalized = value ?? fallbackValue;
    const isMissingArray = Array.isArray(normalized) && normalized.length === 0;
    const isMissingScalar = normalized === null;

    return {
      value: normalized,
      missing: isMissingArray || isMissingScalar,
      sourceName,
    };
  } catch (error) {
    logger.error('central reading stage failed: fetch source', {
      stage: `fetch ${sourceName}`,
      userId,
      weekStart,
      error: error?.message || 'UNKNOWN_FETCH_ERROR',
    });
    throw error;
  }
};

const loadWeeklyContext = async (userId, accessToken) => {
  const now = new Date();
  const weekStart = getWeekStartISO(now);
  const weekRef = getWeekRef(now);
  const [profile, numerologyBase] = await Promise.all([
    getProfileById(userId, accessToken),
    getLatestNumerologyByUserId(userId, accessToken),
  ]);

  const [numerologyWeeklyResult, weeklyCardResult, runesWeeklyResult, ichingWeeklyResult] = await Promise.all([
    safeFetch({
      userId,
      weekStart,
      sourceName: SOURCE_KEYS.numerologyWeekly,
      fallbackValue: null,
      fetcher: () => getNumerologyWeeklyByUserAndWeekStart(userId, weekStart, accessToken),
    }),
    safeFetch({
      userId,
      weekStart,
      sourceName: SOURCE_KEYS.weeklyCard,
      fallbackValue: null,
      fetcher: () => getWeeklyCardByUserAndWeekStart(userId, weekStart, accessToken),
    }),
    safeFetch({
      userId,
      weekStart,
      sourceName: SOURCE_KEYS.runesWeekly,
      fallbackValue: null,
      fetcher: async () => normalizeModulePayload(await getOracleWeeklyModule(userId, weekStart, 'runes_weekly', accessToken)),
    }),
    safeFetch({
      userId,
      weekStart,
      sourceName: SOURCE_KEYS.ichingWeekly,
      fallbackValue: null,
      fetcher: async () => normalizeModulePayload(await getOracleWeeklyModule(userId, weekStart, 'iching_weekly', accessToken)),
    }),
  ]);

  const sourceResults = [
    weeklyCardResult,
    numerologyWeeklyResult,
    runesWeeklyResult,
    ichingWeeklyResult,
  ];

  const missingSources = sourceResults.filter((item) => item.missing).map((item) => item.sourceName);
  const sourcesUsed = sourceResults.filter((item) => !item.missing).map((item) => item.sourceName);

  return {
    weekStart,
    weekRef,
    profile,
    numerologyBase,
    numerologyWeekly: numerologyWeeklyResult.value,
    weeklyCard: weeklyCardResult.value,
    runesWeekly: runesWeeklyResult.value,
    ichingWeekly: ichingWeeklyResult.value,
    numerologyTime: buildNumerologyTime(now),
    missingSources,
    sourcesUsed,
  };
};

export const getCentralOracleRequirements = async (userId, accessToken) => {
  const loaded = await loadWeeklyContext(userId, accessToken);

  return mapRequirements({
    profile: loaded.profile,
    numerologyBase: loaded.numerologyBase,
    numerologyWeekly: loaded.numerologyWeekly,
    weeklyCard: loaded.weeklyCard,
    runesWeekly: loaded.runesWeekly,
    ichingWeekly: loaded.ichingWeekly,
    weekStart: loaded.weekStart,
    weekRef: loaded.weekRef,
  });
};

export const generateCentralReading = async (userId, input = {}, accessToken) => {
  const now = new Date();
  const weekStart = getWeekStartISO(now);
  const weekRef = getWeekRef(now);

  const existingWeeklyUnified = await getUnifiedReadingByUserAndWeekStart(userId, weekStart, accessToken);
  if (existingWeeklyUnified && input.force_regenerate_final !== true) {
    const existingInputs = existingWeeklyUnified.inputs_snapshot || {};
    return {
      week_start: weekStart,
      week_ref: weekRef,
      cached: true,
      partial: Boolean(existingWeeklyUnified.partial),
      missing_sources: existingInputs.missing_sources || [],
      sources_used: existingInputs.sources_used || [],
      reading_id: existingWeeklyUnified.id,
      final_reading: existingWeeklyUnified.final_reading,
      energy_score: existingWeeklyUnified.energy_score,
      tags: existingWeeklyUnified.tags || [],
      unified_reading: existingWeeklyUnified,
    };
  }

  if (input.force_regenerate_modules) {
    try {
      await Promise.all([
        generateRunesWeekly(userId, { force_regenerate: true }, accessToken),
        generateIchingWeekly(userId, { force_regenerate: true }, accessToken),
      ]);
    } catch (error) {
      logger.error('central reading stage failed: fetch modules', {
        stage: 'fetch modules',
        userId,
        weekStart,
        error: error?.message || 'UNKNOWN_MODULES_ERROR',
      });
      throw error;
    }
  }

  const loaded = await loadWeeklyContext(userId, accessToken);

  const modulesSnapshot = {
    profile: buildBasicProfile(loaded.profile),
    tarot_weekly: loaded.weeklyCard,
    numerology_time: loaded.numerologyTime,
    numerology_weekly: loaded.numerologyWeekly,
    runes_weekly: loaded.runesWeekly,
    iching_weekly: loaded.ichingWeekly,
  };

  let aiFallbackUsed = false;
  const partial = loaded.missingSources.length > 0;

  let finalReading;
  try {
    finalReading = await generateSynthesis({
      context: {
        week_start: loaded.weekStart,
        week_ref: loaded.weekRef,
        profile: buildBasicProfile(loaded.profile),
        modules_snapshot: modulesSnapshot,
      },
    });
  } catch (error) {
    logger.error('central reading stage failed: call gemini', {
      stage: 'call gemini',
      userId,
      weekStart: loaded.weekStart,
      error: error?.message || 'UNKNOWN_GEMINI_ERROR',
    });
    aiFallbackUsed = true;
    finalReading = buildFallbackCentralReading();
  }

  const finalPartial = partial || aiFallbackUsed;

  const payload = {
    user_id: userId,
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    inputs_snapshot: {
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      generated_at: new Date().toISOString(),
      missing_sources: loaded.missingSources,
      sources_used: loaded.sourcesUsed,
    },
    modules_snapshot: modulesSnapshot,
    partial: finalPartial,
    final_reading: finalReading,
    energy_score: finalReading.energy_score,
    tags: finalReading.tags || [],
    updated_at: new Date().toISOString(),
  };

  let saved;
  try {
    saved = await upsertUnifiedReading(payload, accessToken);
  } catch (error) {
    logger.error('central reading stage failed: save unified_readings', {
      stage: 'save unified_readings',
      userId,
      weekStart: loaded.weekStart,
      error: error?.message || 'UNKNOWN_SAVE_ERROR',
    });
    throw error;
  }

  return {
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    cached: false,
    partial: finalPartial,
    missing_sources: loaded.missingSources,
    sources_used: loaded.sourcesUsed,
    reading_id: saved.id,
    final_reading: saved.final_reading,
    energy_score: saved.energy_score,
    tags: saved.tags || [],
  };
};
