import asyncHandler from "../utils/async-handler";
import ApiResponse from "../utils/response";
import { Subject } from "../models/subject.model";

// get subjects controller
export const findSubjectsByFilters = asyncHandler(async (req, res) => {
  const subjects = await Subject.find();
  res
    .status(200)
    .json(new ApiResponse(200, { subjects }, "Subjects retrieved"));
});
