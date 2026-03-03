import { getProfileById } from '../../repositories/profileRepository.js';
import { getLatestNumerologyByUserId } from '../../repositories/numerologyRepository.js';
import { getNumerologyWeeklyByUserAndWeekStart } from '../../repositories/numerologyWeeklyRepository.js';
import { getWeeklyCardByUserAndWeekStart } from '../../repositories/weeklyCardRepository.js';
import { getOracleWeeklyModule } from '../../repositories/oracleWeeklyModuleRepository.js';
import { listRecentTarotReadingsByUserId } from '../../repositories/tarotReadingRepository.js';
import {
  createUnifiedReading,
  getUnifiedReadingByUserAndWeekStart,
  updateUnifiedReadingById,
} from '../../repositories/unifiedReadingRepository.js';
import { generateSynthesis } from './synthesisAiService.js';
import { generateRunesWeekly } from './runesWeeklyService.js';
import { generateIchingWeekly } from './ichingWeeklyService.js';
import { getIsoWeekInfo } from '../../utils/week.js';

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

  const canGenerate =
    requirementsStatus.has_profile
    && requirementsStatus.has_numerology_base
    && requirementsStatus.has_weekly_tarot_card
    && requirementsStatus.has_numerology_weekly
    && requirementsStatus.has_runes_weekly
    && requirementsStatus.has_iching_weekly;

  return {
    week_start: weekStart,
    week_ref: weekRef,
    requirements_status: requirementsStatus,
    can_generate_general_reading: canGenerate,
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

const summarizeTarotHistory = (readings = []) => {
  if (!readings.length) {
    return {
      total: 0,
      latest_titles: [],
      note: 'Sem histórico recente de tarot.',
    };
  }

  return {
    total: readings.length,
    latest_titles: readings
      .slice(0, 5)
      .map((reading) => reading?.title || reading?.spread_type || reading?.question || 'Leitura sem título'),
    note: 'Resumo simples para padrões recentes.',
  };
};

const loadWeeklyContext = async (userId, accessToken) => {
  const { weekStart, weekRef } = getIsoWeekInfo();

  const [
    profile,
    numerologyBase,
    numerologyWeekly,
    weeklyCard,
    runesWeekly,
    ichingWeekly,
    tarotReadings,
  ] = await Promise.all([
    getProfileById(userId),
    getLatestNumerologyByUserId(userId),
    getNumerologyWeeklyByUserAndWeekStart(userId, weekStart),
    getWeeklyCardByUserAndWeekStart(userId, weekStart),
    getOracleWeeklyModule(userId, weekStart, 'runes_weekly', accessToken),
    getOracleWeeklyModule(userId, weekStart, 'iching_weekly', accessToken),
    listRecentTarotReadingsByUserId(userId, 10),
  ]);

  return {
    weekStart,
    weekRef,
    profile,
    numerologyBase,
    numerologyWeekly,
    weeklyCard,
    runesWeekly,
    ichingWeekly,
    tarotReadings,
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
  if (input.force_regenerate_modules) {
    await Promise.all([
      generateRunesWeekly(userId, { question: input.question, force_regenerate: true }, accessToken),
      generateIchingWeekly(userId, { question: input.question, force_regenerate: true }, accessToken),
    ]);
  }
  const loaded = await loadWeeklyContext(userId, accessToken);
  const requirements = mapRequirements({
    profile: loaded.profile,
    numerologyBase: loaded.numerologyBase,
    numerologyWeekly: loaded.numerologyWeekly,
    weeklyCard: loaded.weeklyCard,
    runesWeekly: loaded.runesWeekly,
    ichingWeekly: loaded.ichingWeekly,
    weekStart: loaded.weekStart,
    weekRef: loaded.weekRef,
  });

  if (!requirements.can_generate_general_reading) {
    return {
      can_generate: false,
      partial: false,
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      missing_requirements: requirements.missing_requirements,
      suggested_actions: requirements.suggested_actions,
      sources_used: [],
      message: 'Complete os requisitos mínimos da semana para gerar o Oráculo do Grimório.',
    };
  }

  const inputsSnapshot = {
    question: input.question || null,
    focus_area: input.focus_area || 'geral',
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    force_regenerate_modules: Boolean(input.force_regenerate_modules),
    force_regenerate_final: Boolean(input.force_regenerate_final),
  };

  const modulesSnapshot = {
    tarot_weekly: loaded.weeklyCard,
    numerology_base: loaded.numerologyBase,
    numerology_weekly: loaded.numerologyWeekly,
    runes_weekly: loaded.runesWeekly?.output_payload || null,
    iching_weekly: loaded.ichingWeekly?.output_payload || null,
    tarot_history_summary: summarizeTarotHistory(loaded.tarotReadings.slice(0, 10)),
  };

  const sourcesUsed = Object.entries(modulesSnapshot)
    .filter(([, value]) => Boolean(value) && (!(Array.isArray(value)) || value.length > 0))
    .map(([key]) => key);

  const existingWeeklyUnified = await getUnifiedReadingByUserAndWeekStart(userId, loaded.weekStart);
  if (existingWeeklyUnified && !input.force_regenerate_final) {
    return {
      can_generate: true,
      partial: false,
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      missing_requirements: [],
      sources_used: sourcesUsed,
      final_reading: existingWeeklyUnified.final_reading,
      energy_score: existingWeeklyUnified.energy_score,
      tags: existingWeeklyUnified.tags || [],
      saved_reading_id: existingWeeklyUnified.id,
      cached: true,
    };
  }

  const finalReading = await generateSynthesis({
    context: {
      profile: loaded.profile,
      question: input.question || null,
      focus_area: input.focus_area || 'geral',
      modules_snapshot: modulesSnapshot,
      week_ref: loaded.weekRef,
      week_start: loaded.weekStart,
      recent_tarot_readings: loaded.tarotReadings.slice(0, 10),
    },
    focusArea: input.focus_area || 'geral',
    question: input.question,
    sourcesUsed,
  });

  const energyScore = Math.max(0, Math.min(100, 50 + sourcesUsed.length * 8));
  const tags = ['oraculo_grimorio', loaded.weekRef, input.focus_area || 'geral', ...sourcesUsed].slice(0, 8);

  let savedReadingId = null;
  if (input.save_result !== false) {
    const payload = {
      user_id: userId,
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      focus_area: input.focus_area || 'geral',
      question: input.question || null,
      inputs_snapshot: inputsSnapshot,
      modules_snapshot: modulesSnapshot,
      final_reading: finalReading,
      energy_score: energyScore,
      tags,
    };

    const saved = existingWeeklyUnified
      ? await updateUnifiedReadingById(existingWeeklyUnified.id, payload)
      : await createUnifiedReading(payload);

    savedReadingId = saved.id;
  }

  return {
    can_generate: true,
    partial: false,
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    missing_requirements: [],
    suggested_actions: requirements.suggested_actions,
    sources_used: sourcesUsed,
    final_reading: finalReading,
    energy_score: energyScore,
    tags,
    saved_reading_id: savedReadingId,
    cached: false,
  };
};
