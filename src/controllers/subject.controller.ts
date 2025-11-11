import asyncHandler from "../utils/async-handler";
import ApiError from "../utils/error";
import ApiResponse from "../utils/response";
import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";
import { Subject } from "../models/subject.model";

export const findSubjectsByFilters = asyncHandler(async (req, res) => {
  const subjects = await Subject.find();
  res
    .status(200)
    .json(new ApiResponse(200, { subjects }, "Subjects retrieved"));
});
