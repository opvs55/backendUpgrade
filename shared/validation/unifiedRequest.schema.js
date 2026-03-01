// shared/validation/unifiedRequest.schema.js
import { z } from 'zod';
import { runesInputSchema } from './runes.schema.js';
import { ichingInputSchema } from './iching.schema.js';

export const unifiedRequestSchema = z
  .object({
    runes: runesInputSchema.optional(),
    iching: ichingInputSchema.optional(),
  })
  .refine((data) => data.runes || data.iching, {
    message: 'Envie ao menos um módulo (runes ou iching).',
  });
