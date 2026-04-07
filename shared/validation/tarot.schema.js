import { z } from 'zod';

const cardSchema = z.object({
  nome: z.string().min(1).max(200).trim(),
  invertida: z.boolean().optional(),
});

export const tarotReadingBodySchema = z.discriminatedUnion('spreadType', [
  z.object({
    spreadType: z.literal('threeCards'),
    question: z.string().min(1).max(5000).trim(),
    cards: z.array(cardSchema).length(3),
  }),
  z.object({
    spreadType: z.literal('celticCross'),
    question: z.string().min(1).max(5000).trim(),
    cards: z.array(cardSchema).length(10),
  }),
  z.object({
    spreadType: z.literal('templeOfAphrodite'),
    question: z.object({
      name1: z.string().min(1).max(200).trim(),
      name2: z.string().min(1).max(200).trim(),
    }),
    cards: z.array(cardSchema).length(7),
  }),
  z.object({
    spreadType: z.literal('pathChoice'),
    question: z.object({
      path1: z.string().min(1).max(500).trim(),
      path2: z.string().min(1).max(500).trim(),
    }),
    cards: z.array(cardSchema).length(8),
  }),
]);

export const tarotChatBodySchema = z.object({
  userMessage: z.string().min(1).max(8000).trim(),
  chatContext: z.string().min(1).max(50000).trim(),
});

export const tarotDidacticBodySchema = z.object({
  cardName: z.string().min(1).max(200).trim(),
  cardOrientation: z.string().min(1).max(80).trim(),
  positionName: z.string().min(1).max(200).trim(),
});
