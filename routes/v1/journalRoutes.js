// routes/v1/journalRoutes.js
import { Router } from 'express';
import { authRequired } from '../../middleware/authRequired.js';
import { requireSupabaseBearerSession } from '../../middleware/requireSupabaseBearerSession.js';
import { featuresGenerateRateLimit } from '../../middleware/rateLimitByIp.js';
import {
  getJournalEntries,
  postJournalEntry,
  deleteJournalEntry,
  postJournalReflection,
} from '../../controllers/journalController.js';

const router = Router();

router.use(authRequired);
router.use(requireSupabaseBearerSession);

router.get('/entries', getJournalEntries);
router.post('/entries', postJournalEntry);
router.delete('/entries/:id', deleteJournalEntry);
router.post('/entries/:id/reflect', featuresGenerateRateLimit, postJournalReflection);

export default router;
