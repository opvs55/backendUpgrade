// shared/validation/unifiedRequest.schema.js
import { z } from 'zod';
import { natalChartInputSchema } from './natalChart.schema.js';
import { runesInputSchema } from './runes.schema.js';
import { ichingInputSchema } from './iching.schema.js';

export const unifiedRequestSchema = z
  .object({
    natal_chart: natalChartInputSchema.optional(),
    runes: runesInputSchema.optional(),
    iching: ichingInputSchema.optional(),
  })
  .refine((data) => data.natal_chart || data.runes || data.iching, {
    message: 'Envie ao menos um módulo (natal_chart, runes ou iching).',
  });
