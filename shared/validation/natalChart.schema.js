// shared/validation/natalChart.schema.js
import { z } from 'zod';

export const natalChartInputSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

export const natalChartOutputSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()).min(3),
  challenges: z.array(z.string()).min(3),
  guidance: z.string(),
  disclaimer: z.string(),
});
