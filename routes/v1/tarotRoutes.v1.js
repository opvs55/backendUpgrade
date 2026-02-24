// routes/v1/tarotRoutes.v1.js
import { Router } from 'express';
import {
  generateTarotReading,
  getChatResponse,
  getDidacticMeaning,
} from '../../controllers/tarotController.js';

const router = Router();

router.post('/readings', generateTarotReading);
router.post('/chat', getChatResponse);
router.post('/cards/meaning', getDidacticMeaning);

export default router;
