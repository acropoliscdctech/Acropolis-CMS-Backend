import { Router } from "express";
import {
  markAttendance,
  getAttendanceDetailsForSession,
} from "../controllers/attendance.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";
const router = Router();

router;
router.post("/mark/:classId", authenticateFaculty, markAttendance);
router.get("/details", authenticateFaculty, getAttendanceDetailsForSession);

export default router;
