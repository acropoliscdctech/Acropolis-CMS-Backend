import Router from "express";
import { findStudentsByFilters } from "../controllers/student.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";
const router = Router();

router.get("/find", authenticateFaculty, findStudentsByFilters);

export default router;
