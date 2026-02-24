import { Router } from 'express';
import { generateCentralOracle, getCentralRequirements } from '../controllers/oracleController.js';
import { authRequired } from '../middleware/authRequired.js';

const router = Router();

router.use(authRequired);
router.get('/central/requirements', getCentralRequirements);
router.post('/central/generate', generateCentralOracle);

export default router;
