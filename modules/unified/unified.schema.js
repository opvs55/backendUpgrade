// modules/unified/unified.schema.js
import { AppError } from '../../shared/http/AppError.js';
import { ERROR_CODES } from '../../shared/http/errorCodes.js';
import { unifiedNormalizedSchema, unifiedOutputSchema } from '../../shared/validation/unified.schema.js';

export const parseNormalizedOutput = (data) => {
  const parsed = unifiedNormalizedSchema.safeParse(data);
  if (!parsed.success) {
    throw new AppError('Falha na normalização de módulo.', {
      code: ERROR_CODES.MODULE_FAILURE,
      status: 500,
      details: parsed.error.issues,
    });
  }
  return parsed.data;
};

export const parseUnifiedOutput = (data) => {
  const parsed = unifiedOutputSchema.safeParse(data);
  if (!parsed.success) {
    throw new AppError('Síntese final inválida.', {
      code: ERROR_CODES.INTERNAL_ERROR,
      status: 500,
      details: parsed.error.issues,
    });
  }
  return parsed.data;
};
