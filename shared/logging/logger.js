// shared/logging/logger.js
const sanitizeMeta = (meta) => {
  if (!meta) {
    return undefined;
  }
  const cloned = { ...meta };
  if (cloned.payload) {
    cloned.payload = '[REDACTED]';
  }
  return cloned;
};

const log = (level, message, meta = {}) => {
  const output = {
    level,
    message,
    time: new Date().toISOString(),
    ...sanitizeMeta(meta),
  };
  const logger = level === 'error' ? console.error : console.log;
  logger(JSON.stringify(output));
};

export const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};
