// routes/v1/numerologyRoutes.v1.js
import { Router } from 'express';
import {
  getOrCalculateNumerology,
  getOrCalculateWeeklyNumerology,
  resetNumerologyReading,
} from '../../controllers/numerologyController.js';
import { authRequired } from '../../middleware/authRequired.js';
import { requireSupabaseBearerSession } from '../../middleware/requireSupabaseBearerSession.js';
import { numerologyRateLimit } from '../../middleware/rateLimitByIp.js';
import { validate } from '../../shared/validation/validate.js';
import {
  numerologyPersonalBodySchema,
  numerologyWeeklyBodySchema,
} from '../../shared/validation/numerology.schema.js';

const router = Router();

router.use(authRequired);
router.use(requireSupabaseBearerSession);

router.post('/readings', numerologyRateLimit, validate(numerologyPersonalBodySchema), getOrCalculateNumerology);
router.post('/personal', numerologyRateLimit, validate(numerologyPersonalBodySchema), getOrCalculateNumerology);
router.post('/weekly', numerologyRateLimit, validate(numerologyWeeklyBodySchema), getOrCalculateWeeklyNumerology);
router.delete('/readings/current', resetNumerologyReading);
router.delete('/personal/current', resetNumerologyReading);

export default router;
