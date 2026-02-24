// routes/oraclesRoutes.js
import express from 'express';
import { generateWeeklyOracleReading } from '../controllers/oraclesController.js';

const router = express.Router();

router.post('/weekly', generateWeeklyOracleReading);

export default router;
