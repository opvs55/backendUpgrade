export const getIsoWeekInfo = (date = new Date()) => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);

  const isoYear = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);

  const weekStart = new Date(target);
  weekStart.setUTCDate(target.getUTCDate() - 3);

  return {
    weekRef: `${isoYear}-W${String(week).padStart(2, '0')}`,
    weekStart: weekStart.toISOString().slice(0, 10),
  };
};
