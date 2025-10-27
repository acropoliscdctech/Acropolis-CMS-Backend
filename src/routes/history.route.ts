import { Router } from 'express';
import {
  getFacultyHistoryFilters,
  getHistorySummary,
  getHistorySessionDetails,
} from '../controllers/history.controller';
import { authenticateFaculty } from '../middlewares/auth.middleware';

const router = Router();

// Get all unique filter combinations for the logged-in faculty
router.get('/filters', authenticateFaculty, getFacultyHistoryFilters);

// Get the date-wise summary for a specific set of filters
router.get('/summary', authenticateFaculty, getHistorySummary);

// Get the detailed student list for a specific session (filters + date)
router.get('/session-details', authenticateFaculty, getHistorySessionDetails);

export default router;

