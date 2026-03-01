// routes/v1/index.js
import { Router } from 'express';
import tarotRoutes from './tarotRoutes.v1.js';
import numerologyRoutes from './numerologyRoutes.v1.js';
import oraclesRoutes from './oraclesRoutes.v1.js';
import unifiedRoutes from './unifiedRoutes.v1.js';
import oracleRoutes from '../oracleRoutes.js';
import unifiedReadingRoutes from '../unifiedReadingRoutes.js';

const router = Router();

router.use('/tarot', tarotRoutes);
router.use('/numerology', numerologyRoutes);
router.use('/oracles', oraclesRoutes);
router.use('/unified', unifiedRoutes);
router.use('/oracles', oracleRoutes);
router.use('/unified-readings', unifiedReadingRoutes);

export default router;
