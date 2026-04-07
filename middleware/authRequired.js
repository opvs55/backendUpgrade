import { AppError } from '../shared/http/AppError.js';
import { ERROR_CODES } from '../shared/http/errorCodes.js';
import { supabaseAnonClient } from '../config/supabaseClient.js';

const allowDevUserHeader = () =>
  process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_USER_HEADER === 'true';

export const authRequired = async (req, _res, next) => {
  const devUserId = req.headers['x-dev-user-id'];
  const authHeader = req.headers.authorization;

  if (devUserId && allowDevUserHeader()) {
    req.user = { id: String(devUserId), authMode: 'dev' };
    req.accessToken = null;
    return next();
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data, error } = await supabaseAnonClient.auth.getUser(token);
      const userId = data?.user?.id;
      if (!error && userId) {
        req.user = { id: String(userId), token, authMode: 'bearer' };
        req.accessToken = token;
        return next();
      }
    } catch {
      // Continua para o erro padrão de autenticação abaixo.
    }
  }

  return next(new AppError('Autenticação obrigatória.', { code: ERROR_CODES.AUTH_REQUIRED, status: 401 }));
};
