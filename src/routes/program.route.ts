import { Router } from "express";
import { getAllPrograms } from "../controllers/program.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateFaculty, getAllPrograms);

export default router;
