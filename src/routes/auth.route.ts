import { Router } from "express";
import { login, logout, checkAuth } from "../controllers/auth.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/check-auth", authenticateFaculty, checkAuth);

export default router;
