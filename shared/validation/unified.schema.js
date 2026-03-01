import { z } from 'zod';
import { runesInputSchema } from './runes.schema.js';
import { ichingInputSchema } from './iching.schema.js';

export const unifiedInputSchema = z.object({
  question: z.string().optional(),
  focusArea: z.string().optional(),
  runesInput: runesInputSchema.optional(),
  ichingInput: ichingInputSchema.optional(),
  tarotSnapshot: z.object({ summary: z.string().optional() }).passthrough().optional(),
  numerologySnapshot: z.object({ summary: z.string().optional() }).passthrough().optional(),
}).refine((data) => data.runesInput || data.ichingInput, {
  message: 'Informe ao menos um módulo de entrada.',
});

export const unifiedNormalizedSchema = z.object({
  themes: z.array(z.string()),
  risk_flags: z.array(z.string()),
  strength_flags: z.array(z.string()),
  recommended_actions: z.array(z.string()),
});

export const unifiedOutputSchema = z.object({
  headline: z.string(),
  essence: z.string(),
  main_strength: z.string(),
  attention_point: z.string(),
  daily_action: z.string(),
  micro_actions: z.array(z.string()).length(3),
  integrated_reading: z.string(),
  disclaimer: z.string(),
});

export const parseNormalizedOutput = (payload) => unifiedNormalizedSchema.parse(payload);
export const parseUnifiedOutput = (payload) => unifiedOutputSchema.parse(payload);
