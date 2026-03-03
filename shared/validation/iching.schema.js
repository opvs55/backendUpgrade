// shared/validation/iching.schema.js
import { z } from 'zod';

export const ichingInputSchema = z.object({
  question: z.string().min(1),
  method: z.string().optional(),
  hexagram: z.string().optional(),
}).refine((data) => data.method || data.hexagram, {
  message: 'Informe method ou hexagram.',
});

export const ichingOutputSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  one_liner: z.string(),
  ritual: z.string(),
  reflection_question: z.string(),
  themes: z.array(z.string()).min(2),
  recommended_actions: z.array(z.string()).min(2),
  disclaimer: z.string(),
});
