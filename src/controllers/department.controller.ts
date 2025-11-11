import asyncHandler from "../utils/async-handler";
import ApiResponse from "../utils/response";
import { Department } from "../models/department.model";

export const getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find()
    .select("name shortName")
    .sort({ name: 1 });
  res
    .status(200)
    .json(new ApiResponse(200, { departments }, "Departments retrieved"));
});
