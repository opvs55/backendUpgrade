import { Router } from 'express';
import {
  generateCentralOracle,
  generateIchingWeeklyOracle,
  generateRunesWeeklyOracle,
  getCentralRequirements,
} from '../controllers/oracleController.js';
import { authRequired } from '../middleware/authRequired.js';

const router = Router();

router.use(authRequired);
router.get('/central/requirements', getCentralRequirements);
router.post('/central/generate', generateCentralOracle);
router.post('/runes/weekly/generate', generateRunesWeeklyOracle);
router.post('/iching/weekly/generate', generateIchingWeeklyOracle);

export default router;
