// routes/v1/unifiedRoutes.v1.js
import { Router } from 'express';
import {
  createUnifiedReadingHandler,
  getUnifiedReadingHandler,
} from '../../modules/unified/unified.controller.js';
import { validate } from '../../shared/validation/validate.js';
import { unifiedInputSchema } from '../../shared/validation/unified.schema.js';
import { unifiedReadingIdParamsSchema } from '../../shared/validation/unifiedId.schema.js';

const router = Router();

router.post('/readings', validate(unifiedInputSchema), createUnifiedReadingHandler);
router.get('/readings/:id', validate(unifiedReadingIdParamsSchema, 'params'), getUnifiedReadingHandler);

export default router;
