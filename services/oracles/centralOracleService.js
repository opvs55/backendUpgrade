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

const loadWeeklyContext = async (userId, accessToken) => {
  const now = new Date();
  const weekStart = getWeekStartISO(now);
  const weekRef = getWeekRef(now);

  const [
    profile,
    numerologyBase,
    numerologyWeekly,
    weeklyCard,
    runesWeekly,
    ichingWeekly,
    tarotReadings,
  ] = await Promise.all([
    getProfileById(userId, accessToken),
    getLatestNumerologyByUserId(userId, accessToken),
    getNumerologyWeeklyByUserAndWeekStart(userId, weekStart, accessToken),
    getWeeklyCardByUserAndWeekStart(userId, weekStart, accessToken),
    getOracleWeeklyModule(userId, weekStart, 'runes_weekly', accessToken),
    getOracleWeeklyModule(userId, weekStart, 'iching_weekly', accessToken),
    listRecentTarotReadingsByUserId(userId, 5, accessToken),
  ]);

  return {
    weekStart,
    weekRef,
    profile,
    numerologyBase,
    numerologyWeekly,
    weeklyCard,
    runesWeekly: normalizeModulePayload(runesWeekly),
    ichingWeekly: normalizeModulePayload(ichingWeekly),
    tarotReadings: tarotReadings.slice(0, 5),
    numerologyTime: buildNumerologyTime(now),
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
    return {
      week_start: weekStart,
      week_ref: weekRef,
      cached: true,
      reading_id: existingWeeklyUnified.id,
      final_reading: existingWeeklyUnified.final_reading,
      energy_score: existingWeeklyUnified.energy_score,
      tags: existingWeeklyUnified.tags || [],
      unified_reading: existingWeeklyUnified,
    };
  }

  if (input.force_regenerate_modules) {
    await Promise.all([
      generateRunesWeekly(userId, { force_regenerate: true }, accessToken),
      generateIchingWeekly(userId, { force_regenerate: true }, accessToken),
    ]);
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

  const finalReading = await generateSynthesis({
    context: {
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      profile: loaded.profile,
      modules_snapshot: modulesSnapshot,
    },
  });

  const payload = {
    user_id: userId,
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    inputs_snapshot: {
      week_start: loaded.weekStart,
      week_ref: loaded.weekRef,
      generated_at: new Date().toISOString(),
    },
    modules_snapshot: modulesSnapshot,
    final_reading: finalReading,
    energy_score: finalReading.energy_score,
    tags: finalReading.tags || [],
    updated_at: new Date().toISOString(),
  };

  const saved = await upsertUnifiedReading(payload, accessToken);

  return {
    week_start: loaded.weekStart,
    week_ref: loaded.weekRef,
    cached: false,
    reading_id: saved.id,
    final_reading: saved.final_reading,
    energy_score: saved.energy_score,
    tags: saved.tags || [],
  };
};
