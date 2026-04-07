import { z } from 'zod';

const WEEK_REF_REGEX = /^\d{4}-W\d{2}$/;
const FALLBACK_SIGNAL = 'Sinal ausente nesta semana';

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const ensureText = (value, fallback) => sanitizeText(value) || fallback;

const toParagraphArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeText(item))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\n{2,}/)
      .map((item) => sanitizeText(item))
      .filter(Boolean);
  }
  return [];
};

const toStringArray = (value, { fallback = [] } = {}) => {
  const values = Array.isArray(value) ? value : [];
  const normalized = values
    .map((item) => sanitizeText(item))
    .filter(Boolean);

  if (normalized.length > 0) {
    return normalized;
  }
  return [...fallback];
};

const clampEnergyScore = (value, fallback = 62) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const nonEmptyStringSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1));

const nonEmptyStringArraySchema = z.array(nonEmptyStringSchema).min(1);

export const weekRefSchema = nonEmptyStringSchema.regex(
  WEEK_REF_REGEX,
  'week_ref deve seguir o formato YYYY-Www.'
);

export const centralGenerateInputSchema = z.object({
  week_ref: weekRefSchema,
  focus_area: z.string().trim().min(1).max(200).optional(),
  question: z.string().trim().min(1).max(1000).optional(),
  force_regenerate_modules: z.boolean().optional(),
});

export const centralFinalReadingSchema = z.object({
  title: nonEmptyStringSchema,
  one_liner: nonEmptyStringSchema,
  overview: nonEmptyStringArraySchema,
  signals: z.object({
    tarot: nonEmptyStringSchema,
    runes: nonEmptyStringSchema,
    i_ching: nonEmptyStringSchema,
    numerology: nonEmptyStringSchema,
  }),
  synthesis: z.object({
    convergences: nonEmptyStringArraySchema,
    tensions: nonEmptyStringArraySchema,
    theme_of_week: nonEmptyStringSchema,
    hidden_lesson: nonEmptyStringSchema,
  }),
  practical_guidance: z.object({
    do: nonEmptyStringArraySchema,
    avoid: nonEmptyStringArraySchema,
    ritual: nonEmptyStringSchema,
    reflection_question: nonEmptyStringSchema,
  }),
  closing: nonEmptyStringSchema,
  tags: z.array(nonEmptyStringSchema),
  energy_score: z.number().min(0).max(100),
});

export const centralGenerateResponseSchema = z.object({
  status: z.enum(['ok', 'partial']),
  cached: z.boolean(),
  week_ref: weekRefSchema,
  can_generate: z.boolean(),
  ai_failed: z.boolean(),
  final_reading: centralFinalReadingSchema,
  reading_id: z.union([z.string(), z.number()]).optional(),
});

export const normalizeCentralFinalReading = (
  reading = {},
  { fallbackSignals = {} } = {}
) => {
  const parsedSignals =
    reading?.signals && typeof reading.signals === 'object' && !Array.isArray(reading.signals)
      ? reading.signals
      : {};
  const parsedSynthesis =
    reading?.synthesis && typeof reading.synthesis === 'object' && !Array.isArray(reading.synthesis)
      ? reading.synthesis
      : {};
  const parsedGuidance =
    reading?.practical_guidance &&
    typeof reading.practical_guidance === 'object' &&
    !Array.isArray(reading.practical_guidance)
      ? reading.practical_guidance
      : {};

  const overview = toParagraphArray(reading.overview);

  const convergences = toStringArray(parsedSynthesis.convergences);
  const tensions = toStringArray(parsedSynthesis.tensions, {
    fallback: ['Equilibre expectativa e execução com ritmo sustentável.'],
  });

  const guidanceDo = toStringArray(parsedGuidance.do, {
    fallback: ['Defina uma prioridade concreta para esta semana.'],
  });
  const guidanceAvoid = toStringArray(parsedGuidance.avoid, {
    fallback: ['Evite assumir compromissos impulsivos.'],
  });

  const fallbackTarot = ensureText(fallbackSignals.tarot, FALLBACK_SIGNAL);
  const fallbackRunes = ensureText(fallbackSignals.runes, FALLBACK_SIGNAL);
  const fallbackIChing = ensureText(
    fallbackSignals.i_ching || fallbackSignals.iching,
    FALLBACK_SIGNAL
  );
  const fallbackNumerology = ensureText(
    fallbackSignals.numerology || fallbackSignals.numerology_time,
    FALLBACK_SIGNAL
  );

  const normalized = {
    title: ensureText(reading.title, 'Leitura Geral Semanal'),
    one_liner: ensureText(
      reading.one_liner,
      'A semana pede clareza emocional e constância nas escolhas.'
    ),
    overview:
      overview.length > 0
        ? overview
        : ['Síntese semanal gerada em modo resiliente com os sinais disponíveis.'],
    signals: {
      tarot: ensureText(parsedSignals.tarot, fallbackTarot),
      runes: ensureText(parsedSignals.runes, fallbackRunes),
      i_ching: ensureText(parsedSignals.i_ching || parsedSignals.iching, fallbackIChing),
      numerology: ensureText(
        parsedSignals.numerology || parsedSignals.numerology_time,
        fallbackNumerology
      ),
    },
    synthesis: {
      convergences:
        convergences.length > 0 ? convergences : ['Use os sinais disponíveis como bússola de foco.'],
      tensions,
      theme_of_week: ensureText(
        parsedSynthesis.theme_of_week,
        convergences[0] || 'Integração entre foco e equilíbrio.'
      ),
      hidden_lesson: ensureText(
        parsedSynthesis.hidden_lesson,
        tensions[0] || 'Ajustes pequenos evitam desgaste acumulado.'
      ),
    },
    practical_guidance: {
      do: guidanceDo,
      avoid: guidanceAvoid,
      ritual: ensureText(
        parsedGuidance.ritual,
        'Reserve 10 minutos diários para revisar foco, energia e próximos passos.'
      ),
      reflection_question: ensureText(
        parsedGuidance.reflection_question,
        'Qual escolha desta semana protege sua energia e seu propósito ao mesmo tempo?'
      ),
    },
    closing: ensureText(
      reading.closing,
      'A leitura foi consolidada para apoiar decisões consistentes ao longo da semana.'
    ),
    tags: toStringArray(reading.tags, { fallback: ['oraculo-central', 'semana'] }).slice(0, 10),
    energy_score: clampEnergyScore(reading.energy_score, 62),
  };

  return centralFinalReadingSchema.parse(normalized);
};

export const validateCentralGenerateResponse = (response) =>
  centralGenerateResponseSchema.parse(response);

