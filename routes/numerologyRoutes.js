// routes/numerologyRoutes.js
import express from 'express';
import { 
  getOrCalculateNumerology, 
  getOrCalculateWeeklyNumerology,
  resetNumerologyReading 
} from '../controllers/numerologyController.js';
import { authRequired } from '../middleware/authRequired.js';
import { requireSupabaseBearerSession } from '../middleware/requireSupabaseBearerSession.js';
import { numerologyRateLimit } from '../middleware/rateLimitByIp.js';
import { validate } from '../shared/validation/validate.js';
import {
  numerologyPersonalBodySchema,
  numerologyWeeklyBodySchema,
} from '../shared/validation/numerology.schema.js';

const router = express.Router();

router.use(authRequired);
router.use(requireSupabaseBearerSession);

router.post('/', numerologyRateLimit, validate(numerologyPersonalBodySchema), getOrCalculateNumerology);
router.post('/weekly', numerologyRateLimit, validate(numerologyWeeklyBodySchema), getOrCalculateWeeklyNumerology);
router.delete('/reset', resetNumerologyReading);

export default router;
