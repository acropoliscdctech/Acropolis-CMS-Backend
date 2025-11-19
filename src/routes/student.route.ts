import Router from "express";
import { findStudentsByFilter } from "../controllers/student.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";
const router = Router();

router.get("/find", authenticateFaculty, findStudentsByFilter);

export default router;
