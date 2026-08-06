/**
 * Rate limit simples por chave (memória). Adequado para instância única;
 * em múltiplas réplicas use Redis ou gateway (Cloudflare, etc.).
 */
const buckets = new Map();

const pruneStale = (now) => {
  if (buckets.size < 2000) return;
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
};

const rateLimitByKey =
  (getKey, { windowMs, max, name = 'default' }) =>
  (req, res, next) => {
    const now = Date.now();
    pruneStale(now);

    const key = `${name}:${getKey(req)}`;
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

export const rateLimitByIp = ({ windowMs, max, name = 'default' }) =>
  rateLimitByKey((req) => req.ip || req.socket?.remoteAddress || 'unknown', { windowMs, max, name });

// Pensado pra rotas autenticadas que chamam a IA: por usuário em vez de por
// IP, já que várias contas podem sair do mesmo IP (NAT) e uma conta só
// consegue trocar de IP mas não de usuário. Cai pro IP se req.user não
// estiver populado (não deveria acontecer depois de authRequired).
export const rateLimitByUser = ({ windowMs, max, name = 'default' }) =>
  rateLimitByKey(
    (req) => req.user?.id || req.ip || 'unknown',
    { windowMs, max, name }
  );

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

// Rotas autenticadas que chamam o Gemini e não tinham nenhum limite além da
// autenticação em si — achado da revisão de código de 2026-08-05.
export const numerologyRateLimit = rateLimitByUser({
  windowMs: Number(process.env.NUMEROLOGY_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.NUMEROLOGY_RATE_MAX || 20),
  name: 'numerology:generate',
});

export const featuresGenerateRateLimit = rateLimitByUser({
  windowMs: Number(process.env.FEATURES_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.FEATURES_RATE_MAX || 20),
  name: 'features:generate',
});

export const oracleGenerateRateLimit = rateLimitByUser({
  windowMs: Number(process.env.ORACLE_GENERATE_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.ORACLE_GENERATE_RATE_MAX || 10),
  name: 'oracle:generate',
});
