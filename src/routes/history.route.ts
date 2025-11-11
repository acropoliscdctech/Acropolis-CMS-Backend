import { Router } from "express";
import { getHistorySessionDetails } from "../controllers/history.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";

const router = Router();

router.get("/session-details", authenticateFaculty, getHistorySessionDetails);

export default router;
