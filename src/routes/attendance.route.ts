import { Router } from "express";
import {
  markAttendance,
  getAttendanceSummaryForStudents,
  getHistorySessionDetails,
  getStudentAttendanceHistory,
  exportAttendanceSummaryWithDates,
} from "../controllers/attendance.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";
const router = Router();

router.post("/mark", authenticateFaculty, markAttendance);
router.get("/summary", authenticateFaculty, getAttendanceSummaryForStudents);
router.get(
  "/summary/export",
  authenticateFaculty,
  exportAttendanceSummaryWithDates,
);
router.get("/session-details", authenticateFaculty, getHistorySessionDetails);
router.get(
  "/student-history",
  authenticateFaculty,
  getStudentAttendanceHistory,
);

export default router;
