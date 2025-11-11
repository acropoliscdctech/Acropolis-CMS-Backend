import asyncHandler from "../utils/async-handler";
import ApiResponse from "../utils/response";
import { AcademicProgram } from "../models/academicProgram.model";

export const getAllPrograms = asyncHandler(async (req, res) => {
  const programs = await AcademicProgram.find()
    .select("name shortName")
    .sort({ name: 1 });
  res
    .status(200)
    .json(new ApiResponse(200, { programs }, "Programs retrieved"));
});
