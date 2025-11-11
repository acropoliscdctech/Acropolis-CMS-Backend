import { TimeSlot } from "../models/timeSlot.model";
import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import ApiResponse from "../utils/response";
import ApiError from "../utils/error";

export const getAllTimeSlots = asyncHandler(
  async (req: Request, res: Response) => {
    const timeSlots = await TimeSlot.find().sort({ periodNumber: 1 });
    res
      .status(200)
      .json(
        new ApiResponse(200, { timeSlots }, "Time slots fetched successfully")
      );
  }
);
