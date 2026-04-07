/**
 * Rotas que precisam de JWT do Supabase no header (RLS como usuário).
 * Use após authRequired: bloqueia bypass x-dev-user-id sem Bearer.
 */
export const requireSupabaseBearerSession = (req, res, next) => {
  if (!req.accessToken) {
    return res.status(401).json({
      error: 'Sessão Supabase obrigatória. Envie Authorization: Bearer <access_token>.',
    });
  }
  return next();
};
