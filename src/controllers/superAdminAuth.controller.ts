import { Request, Response } from "express";
import ApiResponse from "../utils/response";
import ApiError from "../utils/error";
import asyncHandler from "../utils/async-handler";
import { SuperAdmin } from "../models/superAdmin.model";
import generateToken from "../utils/jwt";
import { AuthenticatedSuperAdminRequest } from "../middlewares/superAdmin.middleware";

const isProduction = process.env.ENVIRONMENT === "production";

// Super Admin login controller
export const superAdminLogin = asyncHandler(
  async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ApiError(400, "Username and password are required");
    }

    const trimmedIdentifier = username.trim().toLowerCase();

    // Support login via username
    const superAdmin = await SuperAdmin.findOne({ username: trimmedIdentifier });

    if (!superAdmin) {
      throw new ApiError(401, "Invalid Super Admin credentials");
    }

    const isMatch = await superAdmin.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid Super Admin credentials");
    }

    const token = generateToken(String(superAdmin._id), "superadmin");

    res.cookie("superAdminToken", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const superAdminResponse = {
      _id: superAdmin._id,
      name: superAdmin.name,
      username: superAdmin.username,
      createdAt: superAdmin.createdAt,
      updatedAt: superAdmin.updatedAt,
    };

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: superAdminResponse,
          token,
        },
        "Super Admin login successful"
      )
    );
  }
);

// Super Admin logout controller
export const superAdminLogout = asyncHandler(
  async (req: Request, res: Response) => {
    res.clearCookie("superAdminToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Super Admin logged out successfully")
      );
  }
);

// Super Admin checkAuth controller
export const superAdminCheckAuth = asyncHandler(
  async (req: AuthenticatedSuperAdminRequest, res: Response) => {
    const user = req.superAdmin;
    return res
      .status(200)
      .json(
        new ApiResponse(200, { user }, "Super Admin is authenticated")
      );
  }
);

//! need to think about it
// Super Admin change password controller
export const changeSuperAdminPassword = asyncHandler(
  async (req: AuthenticatedSuperAdminRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Current and new passwords are required");
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters long");
    }

    const adminId = req.superAdmin?._id;
    const admin = await SuperAdmin.findById(adminId);
    if (!admin) {
      throw new ApiError(404, "Super Admin not found");
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError(400, "Current password does not match");
    }

    admin.password = newPassword;
    await admin.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  }
);
