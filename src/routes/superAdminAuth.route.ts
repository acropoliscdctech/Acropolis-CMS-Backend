import { Router } from "express";
import {
  superAdminLogin,
  superAdminLogout,
  superAdminCheckAuth,
  changeSuperAdminPassword,
} from "../controllers/superAdminAuth.controller";
import { authenticateSuperAdmin } from "../middlewares/superAdmin.middleware";

const router = Router();

// Public auth routes
router.post("/login", superAdminLogin);
router.post("/logout", superAdminLogout);

// Protected auth routes
router.get("/check-auth", authenticateSuperAdmin, superAdminCheckAuth);
router.put(
  "/change-password",
  authenticateSuperAdmin,
  changeSuperAdminPassword
);

export default router;
