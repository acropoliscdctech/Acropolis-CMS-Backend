import { Router } from "express";
import { findSubjectsByFilters } from "../controllers/subject.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateFaculty, findSubjectsByFilters);

export default router;
