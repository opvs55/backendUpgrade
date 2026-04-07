import { createSupabaseServerClient } from '../../config/supabaseClient.js';

/**
 * Prioriza req.user + req.accessToken (rotas com authRequired).
 * Caso contrário, lê Bearer e valida com getUser (rotas legadas /api/numerology).
 */
export const resolveNumerologyContext = async (req) => {
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.accessToken || headerToken;

  if (!token) {
    return { ok: false, status: 401, message: 'Token de autenticação inválido ou ausente.' };
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient(token);
  } catch (clientError) {
    return { ok: false, status: 401, message: clientError.message || 'Falha ao inicializar autenticação.' };
  }

  if (req.user?.id && req.accessToken && token === req.accessToken) {
    return { ok: true, userId: req.user.id, token, supabase };
  }

  const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
  if (userError || !supabaseUser) {
    return { ok: false, status: 401, message: 'Não foi possível validar o usuário com o token fornecido.' };
  }

  return { ok: true, userId: supabaseUser.id, token, supabase };
};
