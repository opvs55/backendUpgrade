/**
 * Rotas que precisam de JWT do Supabase no header (RLS como usuário).
 * Use após authRequired: bloqueia bypass x-dev-user-id sem Bearer.
 */
import { AppError } from '../shared/http/AppError.js';
import { ERROR_CODES } from '../shared/http/errorCodes.js';

export const requireSupabaseBearerSession = (req, _res, next) => {
  if (!req.accessToken) {
    return next(new AppError('Sessão Supabase obrigatória. Envie Authorization: Bearer <access_token>.', {
      code: ERROR_CODES.AUTH_REQUIRED,
      status: 401,
    }));
  }
  return next();
};
