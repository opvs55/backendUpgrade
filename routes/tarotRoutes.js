// routes/tarotRoutes.js
import express from 'express';
import { 
  generateTarotReading, 
  getChatResponse, 
  getDidacticMeaning 
} from '../controllers/tarotController.js';

const router = express.Router();

router.post('/', generateTarotReading);          // Rota POST para /api/tarot
router.post('/chat', getChatResponse);           // Rota POST para /api/tarot/chat
router.post('/card-meaning', getDidacticMeaning); // Rota POST para /api/tarot/card-meaning

export default router;