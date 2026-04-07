import { getProfileById } from '../../repositories/profileRepository.js';
import { getLatestNumerologyByUserId } from '../../repositories/numerologyRepository.js';
import { getNumerologyWeeklyByUserAndWeekStart } from '../../repositories/numerologyWeeklyRepository.js';
import { getWeeklyCardByUserAndWeekRef } from '../../repositories/weeklyCardRepository.js';
import { getOracleWeeklyModule } from '../../repositories/oracleWeeklyModuleRepository.js';
import {
  getUnifiedReadingByUserAndWeekRef,
  upsertUnifiedReading,
} from '../../repositories/unifiedReadingRepository.js';
import { generateSynthesis } from './synthesisAiService.js';
import { generateRunesWeekly } from './runesWeeklyService.js';
import { generateIchingWeekly } from './ichingWeeklyService.js';
import { getWeekRef, getWeekStartISO, getWeekStartFromWeekRef } from '../../utils/week.js';
import { logger } from '../../shared/logging/logger.js';
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';
import {
  normalizeCentralFinalReading,
  validateCentralGenerateResponse,
} from '../../shared/http/centralReadingContract.js';

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

const safeOptionalFetch = async ({ sourceName, fallbackValue = null, fetcher, loggerContext = {} }) => {
  try {
    const value = await fetcher();
    return value ?? fallbackValue;
  } catch (error) {
    logger.warn('central reading optional source unavailable', {
      source: sourceName,
      ...loggerContext,
      error: error?.message || 'UNKNOWN_OPTIONAL_SOURCE_ERROR',
    });
    return fallbackValue;
  }
};

const collectTextValues = (...values) => values
  .flatMap((value) => (Array.isArray(value) ? value : [value]))
  .filter((value) => typeof value === 'string' && value.trim().length > 0)
  .map((value) => value.trim());

const collectModuleThemes = (module = {}) => collectTextValues(
  module?.themes,
  module?.theme,
  module?.summary?.themes,
  module?.headline,
  module?.summary,
);

const collectRecommendedActions = (module = {}) => collectTextValues(
  module?.recommended_actions,
  module?.actions,
  module?.practical_guidance,
  module?.guidance,
);

const extractFallbackSignals = (modulesSnapshot) => {
  const signals = {};
  const tarot = modulesSnapshot.tarot_weekly;
  const runes = modulesSnapshot.runes_weekly;
  const iching = modulesSnapshot.iching_weekly;
  const numerologyTime = modulesSnapshot.numerology_time;

  if (tarot?.card_name || tarot?.card?.name) {
    const cardName = tarot.card_name || tarot.card?.name;
    signals.tarot = `Tarot semanal aponta ${cardName} como arquétipo de foco para suas decisões.`;
  } else {
    signals.tarot = 'Sinal ausente nesta semana';
  }

  if (runes?.rune_name || runes?.rune?.name) {
    const runeName = runes.rune_name || runes.rune?.name;
    signals.runes = `Runas destacam ${runeName}, pedindo atitude consciente e leitura dos sinais do dia.`;
  } else {
    signals.runes = 'Sinal ausente nesta semana';
  }

  if (iching?.hexagram_number || iching?.hexagram?.number) {
    const hexagram = iching.hexagram_number || iching.hexagram?.number;
    signals.i_ching = `I Ching indica o hexagrama ${hexagram} como movimento-base para conduzir a semana.`;
  } else {
    signals.i_ching = 'Sinal ausente nesta semana';
  }

  if (numerologyTime?.month_energy) {
    signals.numerology = `Numerologia temporal marca energia ${numerologyTime.month_energy}, favorecendo consistência e ajustes graduais.`;
  } else {
    signals.numerology = 'Sinal ausente nesta semana';
  }

  return signals;
};

const buildFallbackCentralReading = ({ modulesSnapshot }) => {
  const modules = [
    modulesSnapshot.tarot_weekly,
    modulesSnapshot.numerology_weekly,
    modulesSnapshot.runes_weekly,
    modulesSnapshot.iching_weekly,
  ].filter(Boolean);

  const themes = modules.flatMap((module) => collectModuleThemes(module));
  const actions = modules.flatMap((module) => collectRecommendedActions(module));
  const firstTheme = themes[0] || 'Sinal ausente nesta semana';
  const firstAction = actions[0] || 'Sinal ausente nesta semana';

  return {
    title: 'Leitura Geral Semanal',
    one_liner: `Leitura em modo resiliente com foco em ${firstTheme}.`,
    overview: [
      'A integração por IA falhou temporariamente.',
      `Síntese montada com os dados disponíveis desta semana, priorizando ${firstAction}.`,
    ],
    signals: extractFallbackSignals(modulesSnapshot),
    synthesis: {
      convergences: themes.length > 0 ? themes.slice(0, 5) : ['Sinal ausente nesta semana'],
      tensions: themes.length > 1 ? themes.slice(1, 4).map((theme) => `Equilibrar ${theme} com limites realistas.`) : ['Sinal ausente nesta semana'],
      theme_of_week: firstTheme,
      hidden_lesson: themes[1] || 'Pequenos ajustes consistentes evitam sobrecarga.',
    },
    practical_guidance: {
      do: actions.length > 0 ? actions.slice(0, 4) : ['Sinal ausente nesta semana'],
      avoid: actions.length > 0 ? ['Evitar dispersão e excesso de prioridades em paralelo.'] : ['Sinal ausente nesta semana'],
      ritual: actions.length > 0 ? 'Reserve 10 minutos diários para revisar foco, energia e próximos passos.' : 'Sinal ausente nesta semana',
      reflection_question: themes.length > 0
        ? `Qual escolha desta semana melhor honra o tema "${firstTheme}"?`
        : 'Sinal ausente nesta semana',
    },
    closing: 'Mesmo em fallback, a leitura foi preservada para manter continuidade na sua jornada.',
    tags: ['oraculo-central', 'semana', 'fallback'],
    energy_score: 68,
  };
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
    return {
      value: fallbackValue,
      missing: true,
      sourceName,
    };
  }
};

const assertCentralResponse = (payload) => {
  try {
    return validateCentralGenerateResponse(payload);
  } catch (error) {
    throw new AppError('Contrato inválido para leitura geral semanal.', {
      code: ERROR_CODES.VALIDATION_ERROR,
      status: 422,
      details: error?.issues || [error?.message],
    });
  }
};

const loadWeeklyContext = async (userId, accessToken, { weekStart, weekRef }) => {
  const now = new Date();
  const [profile, numerologyBase] = await Promise.all([
    safeOptionalFetch({
      sourceName: 'profile',
      fetcher: () => getProfileById(userId, accessToken),
      loggerContext: { userId, weekStart },
    }),
    safeOptionalFetch({
      sourceName: 'numerology_base',
      fetcher: () => getLatestNumerologyByUserId(userId, accessToken),
      loggerContext: { userId, weekStart },
    }),
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
      fetcher: () => getWeeklyCardByUserAndWeekRef(userId, weekRef, accessToken),
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
  const now = new Date();
  const weekStart = getWeekStartISO(now);
  const weekRef = getWeekRef(now);
  const loaded = await loadWeeklyContext(userId, accessToken, { weekStart, weekRef });

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
  const weekRef = input.week_ref;
  let weekStart;
  try {
    weekStart = getWeekStartFromWeekRef(weekRef);
  } catch (error) {
    throw new AppError(error.message, {
      code: ERROR_CODES.VALIDATION_ERROR,
      status: 422,
      details: [{ field: 'week_ref', value: weekRef }],
    });
  }

  let existingWeeklyUnified;
  try {
    existingWeeklyUnified = await getUnifiedReadingByUserAndWeekRef(userId, weekRef, accessToken);
  } catch (error) {
    logger.error('central reading stage failed: lookup unified_readings', {
      stage: 'lookup unified_readings',
      userId,
      weekRef,
      error: error?.message || 'UNKNOWN_LOOKUP_ERROR',
    });
    throw new AppError('Falha ao consultar leitura geral semanal existente.', {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      status: 503,
      details: [{ stage: 'lookup unified_readings', message: error?.message }],
    });
  }

  if (existingWeeklyUnified) {
    const fallbackSignals = extractFallbackSignals(existingWeeklyUnified.modules_snapshot || {});
    const finalReading = normalizeCentralFinalReading(existingWeeklyUnified.final_reading || {}, {
      fallbackSignals,
    });
    const existingStatus = ['ok', 'partial'].includes(existingWeeklyUnified.status)
      ? existingWeeklyUnified.status
      : (Boolean(existingWeeklyUnified.ai_failed) ||
        Boolean(existingWeeklyUnified.inputs_snapshot?.partial)
        ? 'partial'
        : 'ok');

    return assertCentralResponse({
      status: existingStatus,
      cached: true,
      week_ref: weekRef,
      can_generate: true,
      ai_failed: Boolean(existingWeeklyUnified.ai_failed),
      reading_id: existingWeeklyUnified.id,
      final_reading: finalReading,
    });
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
      logger.warn('central reading proceeding without forced module regeneration', {
        userId,
        weekStart,
      });
    }
  }

  const loaded = await loadWeeklyContext(userId, accessToken, { weekStart, weekRef });

  const numerologyWeeklyForSnapshot = loaded.numerologyWeekly?.result_payload
    ? {
        ...loaded.numerologyWeekly.result_payload,
        week_start: loaded.numerologyWeekly.week_start,
        week_ref: loaded.numerologyWeekly.week_ref,
      }
    : loaded.numerologyWeekly;

  const modulesSnapshot = {
    profile: buildBasicProfile(loaded.profile),
    tarot_weekly: loaded.weeklyCard,
    numerology_time: loaded.numerologyTime,
    numerology_weekly: numerologyWeeklyForSnapshot,
    runes_weekly: loaded.runesWeekly,
    iching_weekly: loaded.ichingWeekly,
  };

  let aiFallbackUsed = false;
  const partialBySource = loaded.missingSources.length > 0;
  const fallbackSignals = extractFallbackSignals(modulesSnapshot);

  let finalReadingCandidate;
  try {
    finalReadingCandidate = await generateSynthesis({
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
    finalReadingCandidate = buildFallbackCentralReading({ modulesSnapshot });
  }

  let finalReading;
  try {
    finalReading = normalizeCentralFinalReading(finalReadingCandidate, { fallbackSignals });
  } catch (normalizeError) {
    logger.error('central reading stage failed: normalize final_reading', {
      stage: 'normalize final_reading',
      userId,
      weekStart: loaded.weekStart,
      error: normalizeError?.message || 'UNKNOWN_NORMALIZE_ERROR',
    });
    aiFallbackUsed = true;
    finalReading = normalizeCentralFinalReading(buildFallbackCentralReading({ modulesSnapshot }), {
      fallbackSignals,
    });
  }

  const status = partialBySource || aiFallbackUsed ? 'partial' : 'ok';
  const generatedAt = new Date().toISOString();

  const payload = {
    user_id: userId,
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    status,
    cached: false,
    ai_failed: aiFallbackUsed,
    focus_area: input.focus_area || null,
    question: input.question || null,
    inputs_snapshot: {
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      generated_at: generatedAt,
      cached: false,
      partial: status === 'partial',
      ai_failed: aiFallbackUsed,
      missing_sources: loaded.missingSources,
      sources_used: loaded.sourcesUsed,
    },
    modules_snapshot: modulesSnapshot,
    final_reading: finalReading,
    energy_score: finalReading.energy_score,
    tags: finalReading.tags || [],
    updated_at: generatedAt,
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
    throw new AppError('Falha ao persistir leitura geral semanal.', {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      status: 503,
      details: [{ stage: 'save unified_readings', message: error?.message }],
    });
  }

  return assertCentralResponse({
    status,
    cached: false,
    week_ref: loaded.weekRef,
    can_generate: true,
    ai_failed: aiFallbackUsed,
    reading_id: saved.id,
    final_reading: normalizeCentralFinalReading(saved.final_reading || finalReading, {
      fallbackSignals,
    }),
  });
};
