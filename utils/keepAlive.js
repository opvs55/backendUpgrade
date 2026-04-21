const INTERVAL_MS = 14 * 60 * 1000; // 14 minutos

export function startKeepAlive(serverUrl) {
  if (!serverUrl) {
    console.warn('[keep-alive] SERVER_URL não definida — keep-alive desativado.');
    return;
  }

  const target = `${serverUrl.replace(/\/$/, '')}/health`;

  setInterval(async () => {
    try {
      const res = await fetch(target);
      console.log(`[keep-alive] ping OK → ${res.status}`);
    } catch (err) {
      console.warn(`[keep-alive] ping falhou: ${err.message}`);
    }
  }, INTERVAL_MS);

  console.log(`[keep-alive] ativo — ping a cada 14min → ${target}`);
}
