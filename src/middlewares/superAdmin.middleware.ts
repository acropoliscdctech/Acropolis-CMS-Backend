import jsonwebtoken from "jsonwebtoken";
import { SuperAdmin, ISuperAdmin } from "../models/superAdmin.model";
import { Request as ExpressRequest, Response, NextFunction } from "express";
import ApiError from "../utils/error";
import asyncHandler from "../utils/async-handler";

export interface AuthenticatedSuperAdminRequest extends ExpressRequest {
  superAdmin?: ISuperAdmin;
}

export const authenticateSuperAdmin = asyncHandler(
  async (
    req: AuthenticatedSuperAdminRequest,
    res: Response,
    next: NextFunction
  ) => {
    const authHeader = req.headers.authorization;
    let token = req.cookies.superAdminToken || req.cookies.token;

    if (!token && authHeader) {
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      } else {
        token = authHeader;
      }
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new ApiError(500, "JWT secret is not defined", []);
    }

    if (!token) {
      throw new ApiError(
        401,
        "Authentication token is missing. Please log in as Super Admin.",
        []
      );
    }

    let decoded: any;
    try {
      decoded = jsonwebtoken.verify(token, JWT_SECRET);
    } catch (err: any) {
      throw new ApiError(401, "Invalid or expired authentication token", []);
    }

    if (!decoded || typeof decoded === "string" || !decoded.id) {
      throw new ApiError(401, "Invalid authentication token payload", []);
    }

    const superAdmin = await SuperAdmin.findById(decoded.id).select(
      "-password"
    );

    if (!superAdmin) {
      throw new ApiError(
        401,
        "Super Admin account not found or unauthorized",
        []
      );
    }

    req.superAdmin = superAdmin;
    next();
  }
);
