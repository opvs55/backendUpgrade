import { Router } from 'express';
import {
  generateCentralOracle,
  generateIchingWeeklyOracle,
  generateRunesWeeklyOracle,
  getCentralRequirements,
  getIchingWeeklyOracle,
  getRunesWeeklyOracle,
} from '../controllers/oracleController.js';
import { authRequired } from '../middleware/authRequired.js';
import { oracleGenerateRateLimit } from '../middleware/rateLimitByIp.js';

const router = Router();

router.use(authRequired);
router.get('/central/requirements', getCentralRequirements);
router.post('/central/generate', oracleGenerateRateLimit, generateCentralOracle);
router.post('/runes/weekly/generate', oracleGenerateRateLimit, generateRunesWeeklyOracle);
router.get('/runes/weekly/me', getRunesWeeklyOracle);
router.post('/iching/weekly/generate', oracleGenerateRateLimit, generateIchingWeeklyOracle);
router.get('/iching/weekly/me', getIchingWeeklyOracle);

export default router;
