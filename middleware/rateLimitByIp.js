/**
 * Rate limit simples por IP (memória). Adequado para instância única;
 * em múltiplas réplicas use Redis ou gateway (Cloudflare, etc.).
 */
const buckets = new Map();

const pruneStale = (now) => {
  if (buckets.size < 2000) return;
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
};

export const rateLimitByIp =
  ({ windowMs, max, name = 'default' }) =>
  (req, res, next) => {
    const now = Date.now();
    pruneStale(now);

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${name}:${ip}`;
    let entry = buckets.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Muitas requisições neste intervalo. Tente novamente em instantes.',
      });
    }

    return next();
  };

export const tarotReadingRateLimit = rateLimitByIp({
  windowMs: Number(process.env.TAROT_READINGS_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.TAROT_READINGS_RATE_MAX || 24),
  name: 'tarot:readings',
});

export const tarotChatRateLimit = rateLimitByIp({
  windowMs: Number(process.env.TAROT_CHAT_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.TAROT_CHAT_RATE_MAX || 60),
  name: 'tarot:chat',
});

export const tarotDidacticRateLimit = rateLimitByIp({
  windowMs: Number(process.env.TAROT_DIDACTIC_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.TAROT_DIDACTIC_RATE_MAX || 60),
  name: 'tarot:didactic',
});
