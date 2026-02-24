import { Router } from 'express';
import { getMyNatalChart, upsertNatalChart } from '../controllers/natalChartController.js';
import { authRequired } from '../middleware/authRequired.js';

const router = Router();

router.use(authRequired);
router.get('/me', getMyNatalChart);
router.post('/upsert', upsertNatalChart);

export default router;
