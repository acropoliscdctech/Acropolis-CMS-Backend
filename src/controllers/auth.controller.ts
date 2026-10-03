import { Request, Response } from "express";
import ApiResponse from "../utils/response";
import ApiError from "../utils/error";
import asyncHandler from "../utils/async-handler";
import { Faculty, IFaculty } from "../models/faculty.model";
import generateToken from "../utils/jwt";
import bcrypt from "bcrypt";
import { createHash } from "node:crypto";

interface AuthenticatedRequest extends Request {
  user?: IFaculty;
}

const isProduction = process.env.ENVIRONMENT === "production";

// login user controller
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, "Username and password are required");
  }

  const user = await Faculty.findOne({ username });
  if (!user) {
    throw new ApiError(401, "user not found");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateToken(String(user._id), "faculty");
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 day
  });
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Login successful"));
});

// logout user controller
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// checkAuth controller
export const checkAuth = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    return res
      .status(200)
      .json(new ApiResponse(200, { user }, "User is authenticated"));
  }
);

export const completeFacultyPasswordReset = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      throw new ApiError(400, "This password reset link is invalid or has expired");
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters long");
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const faculty = await Faculty.findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: { password: hashedPassword },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
        },
      },
      { new: true, runValidators: true },
    );

    if (!faculty) {
      throw new ApiError(400, "This password reset link is invalid or has expired");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset successfully. You can now sign in."));
  },
);
