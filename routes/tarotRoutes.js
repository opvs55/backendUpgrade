// routes/tarotRoutes.js
import express from 'express';
import { 
  generateTarotReading, 
  getChatResponse, 
  getDidacticMeaning 
} from '../controllers/tarotController.js';
import { validate } from '../shared/validation/validate.js';
import {
  tarotReadingBodySchema,
  tarotChatBodySchema,
  tarotDidacticBodySchema,
} from '../shared/validation/tarot.schema.js';
import {
  tarotReadingRateLimit,
  tarotChatRateLimit,
  tarotDidacticRateLimit,
} from '../middleware/rateLimitByIp.js';

const router = express.Router();

router.post('/', tarotReadingRateLimit, validate(tarotReadingBodySchema), generateTarotReading);
router.post('/chat', tarotChatRateLimit, validate(tarotChatBodySchema), getChatResponse);
router.post('/card-meaning', tarotDidacticRateLimit, validate(tarotDidacticBodySchema), getDidacticMeaning);

export default router;