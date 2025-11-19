import ApiResponse from "../utils/response";
import asyncHandler from "../utils/async-handler";

export const getHealthStatus = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, {}, "Server is healthy"));
});
