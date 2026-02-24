// shared/http/requestId.js
import crypto from 'crypto';

export const requestId = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const generated = `req_${crypto.randomUUID()}`;
  req.requestId = typeof incoming === 'string' && incoming.trim() ? incoming : generated;
  res.setHeader('x-request-id', req.requestId);
  next();
};
