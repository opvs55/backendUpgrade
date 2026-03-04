import { getProfileById } from '../../repositories/profileRepository.js';
import { getLatestNumerologyByUserId } from '../../repositories/numerologyRepository.js';
import { getNumerologyWeeklyByUserAndWeekStart } from '../../repositories/numerologyWeeklyRepository.js';
import { getWeeklyCardByUserAndWeekStart } from '../../repositories/weeklyCardRepository.js';
import { getOracleWeeklyModule } from '../../repositories/oracleWeeklyModuleRepository.js';
import { listRecentTarotReadingsByUserId } from '../../repositories/tarotReadingRepository.js';
import {
  getUnifiedReadingByUserAndWeekStart,
  upsertUnifiedReading,
} from '../../repositories/unifiedReadingRepository.js';
import { generateSynthesis } from './synthesisAiService.js';
import { generateRunesWeekly } from './runesWeeklyService.js';
import { generateIchingWeekly } from './ichingWeeklyService.js';
import { getWeekRef, getWeekStartISO } from '../../utils/week.js';
import { logger } from '../../shared/logging/logger.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';

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
  tarotReadings: 'readings',
};

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

  const [numerologyWeeklyResult, weeklyCardResult, runesWeeklyResult, ichingWeeklyResult, tarotReadingsResult] = await Promise.all([
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
    safeFetch({
      userId,
      weekStart,
      sourceName: SOURCE_KEYS.tarotReadings,
      fallbackValue: [],
      fetcher: async () => (await listRecentTarotReadingsByUserId(userId, 5, accessToken))?.slice(0, 5) || [],
    }),
  ]);

  const sourceResults = [
    weeklyCardResult,
    numerologyWeeklyResult,
    runesWeeklyResult,
    ichingWeeklyResult,
    tarotReadingsResult,
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
    tarotReadings: tarotReadingsResult.value,
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
    const existingSnapshot = existingWeeklyUnified.modules_snapshot || existingWeeklyUnified.inputs_snapshot || {};
    return {
      week_start: weekStart,
      week_ref: weekRef,
      cached: true,
      partial: Boolean(existingWeeklyUnified.partial),
      missing_sources: existingSnapshot.missing_sources || [],
      sources_used: existingSnapshot.sources_used || [],
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
    tarot_weekly: loaded.weeklyCard,
    numerology_time: loaded.numerologyTime,
    numerology_base: loaded.numerologyBase,
    numerology_weekly: loaded.numerologyWeekly,
    runes_weekly: loaded.runesWeekly,
    iching_weekly: loaded.ichingWeekly,
    recent_tarot_history: loaded.tarotReadings,
  };

  const partial = loaded.missingSources.length > 0;
  modulesSnapshot.missing_sources = loaded.missingSources;
  modulesSnapshot.sources_used = loaded.sourcesUsed;

  let finalReading;
  try {
    finalReading = await generateSynthesis({
      context: {
        week_start: loaded.weekStart,
        week_ref: loaded.weekRef,
        profile: loaded.profile,
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
    throw new AppError('Não foi possível gerar a Leitura Geral agora. Tente novamente em instantes.', {
      code: ERROR_CODES.LLM_PROVIDER_ERROR,
      status: 502,
    });
  }

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
    partial,
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
    partial,
    missing_sources: loaded.missingSources,
    sources_used: loaded.sourcesUsed,
    reading_id: saved.id,
    final_reading: saved.final_reading,
    energy_score: saved.energy_score,
    tags: saved.tags || [],
  };
};
