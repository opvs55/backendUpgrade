const toUtcDate = (date = new Date()) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate(),
));

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
