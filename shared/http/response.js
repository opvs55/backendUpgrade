// shared/http/response.js
export const sendSuccess = (res, { data, requestId, status = 200, warnings = [] }) => {
  return res.status(status).json({
    ok: true,
    data,
    meta: {
      requestId,
      warnings,
    },
  });
};
