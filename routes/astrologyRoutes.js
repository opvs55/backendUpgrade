// routes/astrologyRoutes.js
import { Router } from 'express';
import { generateWeeklyAstrologyTheme } from '../controllers/astrologyController.js';

const router = Router();

router.get('/', generateWeeklyAstrologyTheme);
router.post('/', generateWeeklyAstrologyTheme);

router.get('/weekly', generateWeeklyAstrologyTheme);
router.post('/weekly', generateWeeklyAstrologyTheme);



export default router;
