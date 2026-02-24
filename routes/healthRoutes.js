// routes/healthRoutes.js
import { Router } from 'express';

const router = Router();

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'live' });
});

router.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

export default router;
