// routes/v1/oraclesRoutes.v1.js
import { Router } from 'express';
import { generateWeeklyOracleReading } from '../../controllers/oraclesController.js';

import { createRunesReading } from '../../modules/oracles/runes.controller.js';
import { createIchingReading } from '../../modules/oracles/iching.controller.js';
import { validate } from '../../shared/validation/validate.js';
import { runesInputSchema } from '../../shared/validation/runes.schema.js';
import { ichingInputSchema } from '../../shared/validation/iching.schema.js';



const router = Router();

router.post('/weekly-reading', generateWeeklyOracleReading);

router.post('/runes/readings', validate(runesInputSchema), createRunesReading);
router.post('/iching/readings', validate(ichingInputSchema), createIchingReading);



export default router;
