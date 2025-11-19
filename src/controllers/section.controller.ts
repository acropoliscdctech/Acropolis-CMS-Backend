import mongoose from "mongoose";
import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import ApiResponse from "../utils/response";
import ApiError from "../utils/error";
import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";
import { Student } from "../models/student.model";

// get all sections controller
export const getSections = asyncHandler(async (req: Request, res: Response) => {
  const { programShortName, deptShortName, year } = req.query;
  if (!programShortName || !deptShortName || !year) {
    throw new ApiError(
      400,
      "programShortName, deptShortName and year are required"
    );
  }
  const program = await AcademicProgram.findOne({
    shortName: programShortName.toString(),
  })
    .select("_id")
    .lean();
  if (!program) {
    throw new ApiError(404, "Academic Program not found");
  }

  const department = await Department.findOne({
    shortName: deptShortName.toString(),
  })
    .select("_id")
    .lean();
  if (!department) {
    throw new ApiError(404, "Department not found");
  }

  const yearNum = parseInt(year as string, 10);
  if (isNaN(yearNum)) {
    throw new ApiError(400, "Invalid year provided. Must be a number.");
  }

  const filter: mongoose.FilterQuery<any> = {
    program: program._id,
    department: department._id,
    year: yearNum,
    status: "active",
  };

  const sections = await Student.distinct("section", filter);
  res
    .status(200)
    .json(new ApiResponse(200, { sections }, "Sections fetched successfully"));
});
