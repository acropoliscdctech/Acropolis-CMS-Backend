import { Router } from "express";
import {
  markAttendance,
  getAttendanceSummaryForStudents,
  getHistorySessionDetails,
} from "../controllers/attendance.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";
const router = Router();

router.post("/mark", authenticateFaculty, markAttendance);
router.get("/summary", authenticateFaculty, getAttendanceSummaryForStudents);
router.get("/session-details", authenticateFaculty, getHistorySessionDetails);

export default router;
