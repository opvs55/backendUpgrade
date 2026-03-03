import { AppError } from '../shared/http/AppError.js';
import { ERROR_CODES } from '../shared/http/errorCodes.js';

const decodeJwtSub = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.sub || decoded.user_id || null;
  } catch {
    return null;
  }
};

export const authRequired = (req, _res, next) => {
  const devUserId = req.headers['x-dev-user-id'];
  const authHeader = req.headers.authorization;

  if (devUserId) {
    req.user = { id: String(devUserId), authMode: 'dev' };
    req.accessToken = null;
    return next();
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const userId = decodeJwtSub(token);
    if (userId) {
      req.user = { id: String(userId), token, authMode: 'bearer' };
      req.accessToken = token;
      return next();
    }
  }

  return next(new AppError('Autenticação obrigatória.', { code: ERROR_CODES.AUTH_REQUIRED, status: 401 }));
};
