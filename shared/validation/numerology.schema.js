import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD');

/** POST /readings — birthDate só é obrigatória quando ainda não existe leitura (regra no serviço). */
export const numerologyPersonalBodySchema = z.object({
  birthDate: isoDate.optional(),
});

export const numerologyWeeklyBodySchema = z.object({
  weekStart: isoDate,
  birthDate: isoDate.optional(),
});
