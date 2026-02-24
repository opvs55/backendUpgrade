// routes/v1/astrologyRoutes.v1.js
import { Router } from 'express';
import { generateWeeklyAstrologyTheme } from '../../controllers/astrologyController.js';

import { createNatalChartReading } from '../../modules/astrology/natalChart.controller.js';
import { validate } from '../../shared/validation/validate.js';
import { natalChartInputSchema } from '../../shared/validation/natalChart.schema.js';


const router = Router();

router.get('/weekly-theme', generateWeeklyAstrologyTheme);
router.post('/weekly-theme', generateWeeklyAstrologyTheme);

router.post('/natal-chart', validate(natalChartInputSchema), createNatalChartReading);

export default router;
