const toUtcDate = (date = new Date()) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate(),
));

const WEEK_REF_REGEX = /^\d{4}-W\d{2}$/;

export const getWeekStartISO = (date = new Date()) => {
  const target = toUtcDate(date);
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() - (day - 1));
  return target.toISOString().slice(0, 10);
};

export const getWeekRef = (date = new Date()) => {
  const target = toUtcDate(date);
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);

  const isoYear = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);

  return `${isoYear}-W${String(week).padStart(2, '0')}`;
};

export const getIsoWeekInfo = (date = new Date()) => ({
  weekStart: getWeekStartISO(date),
  weekRef: getWeekRef(date),
});

export const isValidWeekRef = (weekRef) =>
  typeof weekRef === 'string' && WEEK_REF_REGEX.test(weekRef.trim());

export const getWeekStartFromWeekRef = (weekRef) => {
  if (!isValidWeekRef(weekRef)) {
    throw new Error('week_ref inválido. Use o formato YYYY-Www.');
  }

  const [yearPart, weekPartRaw] = weekRef.trim().split('-W');
  const year = Number(yearPart);
  const week = Number(weekPartRaw);

  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
    throw new Error('week_ref inválido. Semana deve estar entre 01 e 53.');
  }

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const firstIsoMonday = new Date(jan4);
  firstIsoMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

  const targetMonday = new Date(firstIsoMonday);
  targetMonday.setUTCDate(firstIsoMonday.getUTCDate() + ((week - 1) * 7));

  if (getWeekRef(targetMonday) !== weekRef.trim()) {
    throw new Error('week_ref inválido para o ano informado.');
  }

  return targetMonday.toISOString().slice(0, 10);
};
