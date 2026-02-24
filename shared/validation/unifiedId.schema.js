// shared/validation/unifiedId.schema.js
import { z } from 'zod';

export const unifiedReadingIdParamsSchema = z.object({
  id: z.string().uuid(),
});
