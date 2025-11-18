import { Router } from "express";
import { getSections } from "../controllers/section.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";
const router = Router();
router.get("/", authenticateFaculty, getSections);

export default router;
