import { getProfileById } from '../../repositories/profileRepository.js';
import { getNatalChartByUserId } from '../../repositories/natalChartRepository.js';
import { getLatestNumerologyByUserId } from '../../repositories/numerologyRepository.js';
import { getWeeklyCardByUserAndWeek } from '../../repositories/weeklyCardRepository.js';
import { createUnifiedReading } from '../../repositories/unifiedReadingRepository.js';
import { generateSynthesis } from './synthesisAiService.js';

const getWeekInfo = (date = new Date()) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  const weekRef = `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  const weekStart = new Date(target);
  weekStart.setUTCDate(target.getUTCDate() - 3);
  return { weekRef, weekStart: weekStart.toISOString().slice(0, 10) };
};

const mapRequirements = ({ profile, natalChart, numerology, weeklyCard }) => {
  const status = {
    has_profile: Boolean(profile),
    has_natal_chart: Boolean(natalChart),
    has_numerology: Boolean(numerology),
    has_weekly_card: Boolean(weeklyCard),
  };
  const missing = [];
  if (!status.has_profile) missing.push('profile');
  if (!status.has_natal_chart) missing.push('natal_chart');
  if (!status.has_numerology) missing.push('numerology');

  return {
    can_generate_general_reading: missing.length === 0,
    requirements_status: status,
    missing_requirements: missing,
    suggested_actions: [
      { key: 'natal_chart', label: 'Complete seu mapa astral', path: '/mapa-astral' },
      { key: 'numerology', label: 'Gere sua numerologia', path: '/numerologia' },
      { key: 'weekly_card', label: 'Tire sua carta da semana', path: '/tarot' },
    ].filter((action) => {
      if (action.key === 'weekly_card') return !status.has_weekly_card;
      return missing.includes(action.key);
    }),
  };
};

export const getCentralOracleRequirements = async (userId) => {
  const { weekRef } = getWeekInfo();
  const [profile, natalChart, numerology, weeklyCard] = await Promise.all([
    getProfileById(userId),
    getNatalChartByUserId(userId),
    getLatestNumerologyByUserId(userId),
    getWeeklyCardByUserAndWeek(userId, weekRef),
  ]);

  return mapRequirements({ profile, natalChart, numerology, weeklyCard });
};

export const generateCentralReading = async (userId, input = {}) => {
  const { weekRef, weekStart } = getWeekInfo();
  const [profile, natalChart, numerology, weeklyCard] = await Promise.all([
    getProfileById(userId),
    getNatalChartByUserId(userId),
    getLatestNumerologyByUserId(userId),
    getWeeklyCardByUserAndWeek(userId, weekRef),
  ]);

  const requirements = mapRequirements({ profile, natalChart, numerology, weeklyCard });
  if (!requirements.can_generate_general_reading) {
    return {
      can_generate: false,
      partial: false,
      missing_requirements: requirements.missing_requirements,
      sources_used: [],
      requirements,
      message: 'Complete os requisitos mínimos para gerar a leitura geral.',
    };
  }

  const context = { profile, natal_chart: natalChart, numerology, weekly_card: weeklyCard };
  const sourcesUsed = Object.entries(context)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  const finalReading = await generateSynthesis({
    context,
    focusArea: input.focus_area || 'general',
    question: input.question,
    sourcesUsed,
  });

  const result = {
    can_generate: true,
    partial: !weeklyCard,
    missing_requirements: [],
    sources_used: sourcesUsed,
    final_reading: finalReading,
  };

  if (input.save_result !== false) {
    const saved = await createUnifiedReading({
      user_id: userId,
      week_start: weekStart,
      week_ref: weekRef,
      focus_area: input.focus_area || 'general',
      question: input.question || null,
      inputs_snapshot: context,
      modules_snapshot: { sources_used: sourcesUsed },
      final_reading: finalReading,
      energy_score: Math.max(0, Math.min(100, 60 + sourcesUsed.length * 10)),
      tags: [input.focus_area || 'general', ...(finalReading.sources_used || [])].slice(0, 6),
    });
    result.saved_reading_id = saved.id;
  }

  return result;
};
