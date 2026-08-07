import { resolveNumerologyContext } from '../services/numerology/numerologyContext.js';
import {
  listJournalEntries,
  createJournalEntry,
  updateJournalEntryReflection,
  getJournalEntryById,
  deleteJournalEntryById,
} from '../repositories/journalEntryRepository.js';
import { generateJournalReflectionReading } from '../services/journal/journalReflectionService.js';
import { AppError } from '../shared/http/AppError.js';
import { ERROR_CODES } from '../shared/http/errorCodes.js';

const resolveCtx = async (req, res) => {
  const ctx = await resolveNumerologyContext(req);
  if (!ctx.ok) {
    res.status(ctx.status).json({ error: ctx.message });
    return null;
  }
  return ctx;
};

const MAX_CONTENT_LENGTH = 4000;

export const getJournalEntries = async (req, res, next) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const result = await listJournalEntries(ctx.userId, { limit, offset }, ctx.token);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const postJournalEntry = async (req, res, next) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      return res.status(400).json({ error: 'Escreva algo antes de salvar.' });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({ error: `O texto pode ter no máximo ${MAX_CONTENT_LENGTH} caracteres.` });
    }
    const entry = await createJournalEntry({ userId: ctx.userId, content }, ctx.token);
    return res.status(201).json(entry);
  } catch (err) {
    return next(err);
  }
};

export const deleteJournalEntry = async (req, res, next) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    await deleteJournalEntryById(req.params.id, ctx.userId, ctx.token);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

export const postJournalReflection = async (req, res, next) => {
  try {
    const ctx = await resolveCtx(req, res);
    if (!ctx) return;
    const { cardName } = req.body;
    if (!cardName || typeof cardName !== 'string') {
      return res.status(400).json({ error: 'Forneça cardName.' });
    }

    const entry = await getJournalEntryById(req.params.id, ctx.userId, ctx.token);
    if (!entry) {
      throw new AppError('Memória não encontrada.', { code: ERROR_CODES.NOT_FOUND, status: 404 });
    }
    if (entry.reflection_card_name) {
      return res.status(200).json(entry);
    }

    const { mensagem } = await generateJournalReflectionReading({ cardName, reflectionText: entry.content });
    const updated = await updateJournalEntryReflection(
      entry.id,
      ctx.userId,
      { reflectionCardName: cardName, reflectionMessage: mensagem },
      ctx.token,
    );
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};
