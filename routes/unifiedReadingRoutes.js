import { Router } from 'express';
import { getUnifiedReadingByIdMe, listUnifiedReadingsMe } from '../controllers/unifiedReadingController.js';
import { authRequired } from '../middleware/authRequired.js';

const router = Router();

router.use(authRequired);
router.get('/me', listUnifiedReadingsMe);
router.get('/:id', getUnifiedReadingByIdMe);

export default router;
