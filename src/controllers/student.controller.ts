// /server/src/controllers/studentController.ts
import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import ApiError from "../utils/error";
import ApiResponse from "../utils/response";
import mongoose from "mongoose";
import { Student } from "../models/student.model";
import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";

export const findStudentsByFilter = asyncHandler(
  async (req: Request, res: Response) => {
    const { programShortName, year, deptShortName, section } = req.query;
    if (!programShortName || !year || !deptShortName || !section) {
      throw new ApiError(
        400,
        "Missing required filters: programId, year, departmentId, and section are required."
      );
    }
    const yearNum = parseInt(year as string);
    if (isNaN(yearNum)) {
      throw new ApiError(400, "Invalid year provided.");
    }

    const program = await AcademicProgram.findOne({
      shortName: programShortName as string,
    }).select("_id");
    if (!program) {
      throw new ApiError(
        404,
        `Program with short name ${programShortName} not found`
      );
    }
    const department = await Department.findOne({
      shortName: deptShortName as string,
    }).select("_id");
    if (!department) {
      throw new ApiError(
        404,
        `Department with short name ${department} not found`
      );
    }

    const studentFilters: mongoose.FilterQuery<any> = {
      program: program._id,
      department: department._id,
      year: yearNum,
      section: section as string,
      status: "active", // Only fetch active students
    };

    const students = await Student.find(studentFilters)
      .select("name enrollment email section")
      .sort({ enrollment: 1 });

    if (!students || students.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No students found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { students }, "Students fetched successfully")
      );
  }
);
