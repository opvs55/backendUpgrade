// shared/validation/runes.schema.js
import { z } from 'zod';

export const runesInputSchema = z.object({
  question: z.string().min(1),
  drawCount: z.number().int().min(1).max(5).optional(),
  runes: z.array(z.string()).min(1).optional(),
}).refine((data) => data.drawCount || data.runes, {
  message: 'Informe drawCount ou runes.',
});

export const runesOutputSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  themes: z.array(z.string()).min(2),
  recommended_actions: z.array(z.string()).min(2),
  disclaimer: z.string(),
});
