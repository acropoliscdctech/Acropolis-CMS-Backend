import { Router } from "express";
import { getAllDepartments } from "../controllers/department.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateFaculty, getAllDepartments);

export default router;
