import { Request, Response } from "express";
import ApiResponse from "../utils/response";
import ApiError from "../utils/error";
import asyncHandler from "../utils/async-handler";
import { Faculty, IFaculty } from "../models/faculty.model";
import generateToken from "../utils/jwt";

interface AuthenticatedRequest extends Request {
  user?: IFaculty;
}

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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Login successful"));
});

// logout user controller
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
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
