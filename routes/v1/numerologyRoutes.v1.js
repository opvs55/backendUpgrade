// routes/v1/numerologyRoutes.v1.js
import { Router } from 'express';
import {
  getOrCalculateNumerology,
  resetNumerologyReading,
} from '../../controllers/numerologyController.js';

const router = Router();

router.post('/readings', getOrCalculateNumerology);
router.delete('/readings/current', resetNumerologyReading);

export default router;
