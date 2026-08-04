// utils/geminiRetry.js
import { logger } from '../shared/logging/logger.js';

const RETRYABLE_STATUS = new Set([429, 503]);

const getStatus = (err) => err?.status ?? err?.response?.status ?? err?.cause?.status ?? null;

const isRetryable = (err) => {
  if (RETRYABLE_STATUS.has(getStatus(err))) return true;
  const message = String(err?.message || '');
  return /\b429\b|\b503\b|rate.?limit|too many requests|quota/i.test(message);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Backoff simples pra chamadas ao Gemini: tenta de novo só em erro de rate
// limit/indisponibilidade (429/503), com espera crescente + jitter. Erros de
// outro tipo (prompt inválido, etc.) sobem direto, sem retry.
export async function generateWithRetry(model, prompt, { maxRetries = 3, baseDelayMs = 800 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === maxRetries) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 200;
      logger.warn('gemini.retry', { attempt: attempt + 1, delay: Math.round(delay), error: err?.message });
      await wait(delay);
    }
  }
  throw lastError;
}
