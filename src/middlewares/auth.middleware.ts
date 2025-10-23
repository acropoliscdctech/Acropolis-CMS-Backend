import jsonwebtoken from "jsonwebtoken";
import { Faculty, IFaculty } from "../models/faculty.model";
import { Request as ExpressRequest, Response, NextFunction } from "express";
import ApiError from "../utils/error";
import ApiResponse from "../utils/response";
import asyncHandler from "../utils/async-handler";

interface AuthenticatedRequest extends ExpressRequest {
  user?: IFaculty;
}

export const authenticateFaculty = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new ApiError(500, "JWT secret is not defined", []);
    }
    if (!token) {
      throw new ApiError(401, "Authentication token is missing", []);
    }

    const decoded = jsonwebtoken.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded === "string" || !decoded.id) {
      throw new ApiError(401, "Invalid authentication token", []);
    }
    const user = await Faculty.findById((decoded as { id: string }).id).select(
      "-password"
    );
    if (!user) {
      throw new ApiError(401, "User not found", []);
    }
    req.user = user;
    next();
  }
);
