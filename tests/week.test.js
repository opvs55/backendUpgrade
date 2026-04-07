import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeekRef, getWeekStartFromWeekRef, isValidWeekRef } from '../utils/week.js';

test('isValidWeekRef validates ISO week format', () => {
  assert.equal(isValidWeekRef('2026-W15'), true);
  assert.equal(isValidWeekRef('2026-W5'), false);
  assert.equal(isValidWeekRef('2026/15'), false);
});

test('getWeekStartFromWeekRef returns Monday for valid ISO week', () => {
  const weekStart = getWeekStartFromWeekRef('2026-W15');
  assert.equal(weekStart, '2026-04-06');
  assert.equal(getWeekRef(new Date(`${weekStart}T00:00:00Z`)), '2026-W15');
});

test('getWeekStartFromWeekRef throws for impossible ISO week', () => {
  assert.throws(() => getWeekStartFromWeekRef('2021-W53'), /week_ref inválido/);
});

