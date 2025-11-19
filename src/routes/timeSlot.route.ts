import { Router } from "express";
import { getAllTimeSlots } from "../controllers/timeSlot.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";
const router = Router();

router.get("/", authenticateFaculty, getAllTimeSlots);

export default router;
