// routes/numerologyRoutes.js
import express from 'express';
import { 
  getOrCalculateNumerology, 
  getOrCalculateWeeklyNumerology,
  resetNumerologyReading 
} from '../controllers/numerologyController.js';
import { authRequired } from '../middleware/authRequired.js';
import { requireSupabaseBearerSession } from '../middleware/requireSupabaseBearerSession.js';
import { validate } from '../shared/validation/validate.js';
import {
  numerologyPersonalBodySchema,
  numerologyWeeklyBodySchema,
} from '../shared/validation/numerology.schema.js';

const router = express.Router();

router.use(authRequired);
router.use(requireSupabaseBearerSession);

router.post('/', validate(numerologyPersonalBodySchema), getOrCalculateNumerology);
router.post('/weekly', validate(numerologyWeeklyBodySchema), getOrCalculateWeeklyNumerology);
router.delete('/reset', resetNumerologyReading);

export default router;
