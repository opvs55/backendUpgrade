// routes/v1/index.js
import { Router } from 'express';
import tarotRoutes from './tarotRoutes.v1.js';
import numerologyRoutes from './numerologyRoutes.v1.js';
import oracleRoutes from '../oracleRoutes.js';
import unifiedReadingRoutes from '../unifiedReadingRoutes.js';
import newFeaturesRoutes from './newFeaturesRoutes.js';

const router = Router();

router.use('/tarot', tarotRoutes);
router.use('/numerology', numerologyRoutes);
router.use('/oracles', oracleRoutes);
router.use('/unified-readings', unifiedReadingRoutes);
router.use('/features', newFeaturesRoutes);

export default router;
