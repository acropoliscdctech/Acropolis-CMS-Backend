import { Router } from "express";
import {
  login,
  logout,
  checkAuth,
  completeFacultyPasswordReset,
} from "../controllers/auth.controller";
import { authenticateFaculty } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/reset-password", completeFacultyPasswordReset);
router.get("/check-auth", authenticateFaculty, checkAuth);

export default router;
