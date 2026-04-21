import { Router } from 'express';
import { authRequired } from '../../middleware/authRequired.js';
import { requireSupabaseBearerSession } from '../../middleware/requireSupabaseBearerSession.js';
import {
  getDailyOracle,
  getCompatibility,
  getTransits,
  postIchingActive,
  getIchingActiveList,
  getYearMap,
} from '../../controllers/newFeaturesController.js';

const router = Router();

router.use(authRequired);
router.use(requireSupabaseBearerSession);

// Oráculo Diário
router.get('/daily-oracle', getDailyOracle);

// Mapa do Ano
router.get('/year-map', getYearMap);

// Compatibilidade Numerológica
router.post('/numerology/compatibility', getCompatibility);

// Trânsitos Numerológicos
router.post('/numerology/transits', getTransits);

// I Ching Ativo
router.post('/iching/active', postIchingActive);
router.get('/iching/active', getIchingActiveList);

export default router;
