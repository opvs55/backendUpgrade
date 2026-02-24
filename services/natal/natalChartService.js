import { getNatalChartByUserId, upsertNatalChartByUserId } from '../../repositories/natalChartRepository.js';

const buildStubChart = (payload) => ({
  positions: payload.positions || { note: 'TODO: cálculo astral detalhado pendente de provider.' },
  aspects: payload.aspects || [],
  chart_summary: payload.chart_summary || 'Resumo natal simplificado salvo. Cálculo completo pendente.',
});

export const fetchMyNatalChart = async (userId) => getNatalChartByUserId(userId);

export const upsertMyNatalChart = async (userId, payload) => {
  const stub = buildStubChart(payload);

  return upsertNatalChartByUserId(userId, {
    birth_date: payload.birth_date,
    birth_time: payload.birth_time || null,
    birth_city: payload.birth_city,
    birth_country: payload.birth_country || null,
    birth_timezone: payload.birth_timezone || null,
    zodiac_system: payload.zodiac_system || null,
    house_system: payload.house_system || null,
    positions: stub.positions,
    aspects: stub.aspects,
    chart_summary: stub.chart_summary,
  });
};
