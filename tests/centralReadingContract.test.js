import test from 'node:test';
import assert from 'node:assert/strict';
import {
  centralGenerateInputSchema,
  normalizeCentralFinalReading,
  validateCentralGenerateResponse,
} from '../shared/http/centralReadingContract.js';

test('centralGenerateInputSchema requires valid week_ref', () => {
  const invalid = centralGenerateInputSchema.safeParse({ week_ref: '2026/15' });
  assert.equal(invalid.success, false);

  const valid = centralGenerateInputSchema.safeParse({ week_ref: '2026-W15' });
  assert.equal(valid.success, true);
});

test('normalizeCentralFinalReading enforces minimum contract fields', () => {
  const reading = normalizeCentralFinalReading(
    {
      title: 'Leitura',
      one_liner: 'Resumo',
      overview: 'Texto único',
      signals: { tarot: 'A', runes: 'B' },
      synthesis: { convergences: ['Convergência principal'] },
      practical_guidance: { do: ['Ação 1'] },
      closing: 'Fechamento',
      tags: ['tag'],
      energy_score: 50,
    },
    {
      fallbackSignals: {
        tarot: 'Tarot fallback',
        runes: 'Runas fallback',
        i_ching: 'I Ching fallback',
        numerology: 'Numerologia fallback',
      },
    }
  );

  assert.ok(Array.isArray(reading.overview));
  assert.ok(reading.overview.length >= 1);
  assert.ok(Array.isArray(reading.synthesis.convergences));
  assert.ok(reading.synthesis.convergences.length >= 1);
  assert.ok(Array.isArray(reading.synthesis.tensions));
  assert.ok(reading.synthesis.tensions.length >= 1);
  assert.ok(Array.isArray(reading.practical_guidance.do));
  assert.ok(reading.practical_guidance.do.length >= 1);
  assert.ok(Array.isArray(reading.practical_guidance.avoid));
  assert.ok(reading.practical_guidance.avoid.length >= 1);
  assert.notEqual(reading.closing.trim(), '');
});

test('validateCentralGenerateResponse rejects invalid output payload', () => {
  assert.throws(
    () =>
      validateCentralGenerateResponse({
        status: 'ok',
        cached: true,
        week_ref: '2026-W15',
        can_generate: true,
        ai_failed: false,
        final_reading: {
          title: '',
        },
      }),
    /Invalid input/
  );
});

