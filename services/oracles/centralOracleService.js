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
    signals.iching = `I Ching indica o hexagrama ${hexagram} como movimento-base para conduzir a semana.`;
  } else {
    signals.iching = 'Sinal ausente nesta semana';
  }

  if (numerologyTime?.month_energy) {
    signals.numerology_time = `Numerologia temporal marca energia ${numerologyTime.month_energy}, favorecendo consistência e ajustes graduais.`;
  } else {
    signals.numerology_time = 'Sinal ausente nesta semana';
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
    title: 'Oráculo Central da Semana',
    one_liner: `Leitura em modo resiliente com foco em ${firstTheme}.`,
    overview: `A integração por IA falhou temporariamente. Síntese montada com os dados disponíveis desta semana, priorizando ${firstAction}.`,
    signals: extractFallbackSignals(modulesSnapshot),
    synthesis: {
      convergences: themes.length > 0 ? themes.slice(0, 5) : ['Sinal ausente nesta semana'],
      tensions: themes.length > 1 ? themes.slice(1, 4).map((theme) => `Equilibrar ${theme} com limites realistas.`) : ['Sinal ausente nesta semana'],
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

const loadWeeklyContext = async (userId, accessToken) => {
  const now = new Date();
  const weekStart = getWeekStartISO(now);
  const weekRef = getWeekRef(now);
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

  const existingWeeklyUnified = await safeOptionalFetch({
    sourceName: 'unified_readings_lookup',
    fetcher: () => getUnifiedReadingByUserAndWeekStart(userId, weekStart, accessToken),
    loggerContext: { userId, weekStart },
  });
  if (existingWeeklyUnified && input.force_regenerate_final !== true) {
    const existingInputs = existingWeeklyUnified.inputs_snapshot || {};
    return {
      week_start: weekStart,
      week_ref: weekRef,
      cached: true,
      partial: Boolean(existingInputs.partial),
      ai_failed: Boolean(existingInputs.ai_failed),
      reading_id: existingWeeklyUnified.id,
      final_reading: existingWeeklyUnified.final_reading,
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
      logger.warn('central reading proceeding without forced module regeneration', {
        userId,
        weekStart,
      });
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
    finalReading = buildFallbackCentralReading({ modulesSnapshot });
  }

  const finalPartial = partial || aiFallbackUsed;
  const generatedAt = new Date().toISOString();

  const payload = {
    user_id: userId,
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    focus_area: input.focus_area || null,
    question: input.question || null,
    inputs_snapshot: {
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      generated_at: generatedAt,
      cached: false,
      partial: finalPartial,
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
    const fallbackReadingId = `unsaved-${loaded.weekStart}-${userId}`;
    logger.warn('central reading returning unsaved fallback due persistence failure', {
      userId,
      weekStart: loaded.weekStart,
      fallbackReadingId,
    });

    return {
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      cached: false,
      partial: true,
      ai_failed: true,
      reading_id: fallbackReadingId,
      final_reading: finalReading,
    };
  }

  return {
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    cached: false,
    partial: finalPartial,
    ai_failed: aiFallbackUsed,
    reading_id: saved.id,
    final_reading: saved.final_reading,
  };
};
