import { Request, Response } from "express";
import mongoose from "mongoose";

import ApiResponse from "../utils/response";
import ApiError from "../utils/error";
import asyncHandler from "../utils/async-handler";

import { IFaculty } from "../models/faculty.model";
import { AttendanceRecord } from "../models/attendanceRecord.model";
import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";
import { Subject } from "../models/subject.model";

interface AuthenticatedRequest extends Request {
  user?: IFaculty;
}

export const getHistorySessionDetails = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Get and validate query parameters
    const {
      programShortName,
      deptShortName,
      subjectCode,
      semester,
      section,
      date,
    } = req.query;

    const filters = {
      programShortName,
      deptShortName,
      subjectCode,
      semester,
      section,
      date,
    };
    const requiredFields = [
      "programShortName",
      "deptShortName",
      "subjectCode",
      "semester",
      "section",
      "date",
    ];

    for (const field of requiredFields) {
      const value = filters[field as keyof typeof filters];
      if (!value) {
        throw new ApiError(400, `Query parameter '${field}' is required.`);
      }
      if (typeof value !== "string") {
        throw new ApiError(400, `Query parameter '${field}' must be a string.`);
      }
    }

    // 2. Look up reference IDs
    const program = await AcademicProgram.findOne({
      shortName: programShortName as string,
    })
      .select("_id")
      .lean();
    const department = await Department.findOne({
      shortName: deptShortName as string,
    })
      .select("_id")
      .lean();
    const subject = await Subject.findOne({
      subjectCode: subjectCode as string,
    })
      .select("_id")
      .lean();

    if (!program) {
      throw new ApiError(404, `Program not found: ${programShortName}`);
    }
    if (!department) {
      throw new ApiError(404, `Department not found: ${deptShortName}`);
    }
    if (!subject) {
      throw new ApiError(404, `Subject not found: ${subjectCode}`);
    }

    // Validate and parse semester
    const semesterNum = parseInt(semester as string, 10);
    if (isNaN(semesterNum)) {
      throw new ApiError(
        400,
        'Query parameter "semester" must be a valid number.'
      );
    }

    // Basic validation for date string
    if (date && !/\d{4}-\d{2}-\d{2}/.test(date as string)) {
      throw new ApiError(
        400,
        `Query parameter 'date' must be in YYYY-MM-DD format.`
      );
    }

    // 3. Build the match query
    const matchQuery: { [key: string]: any } = {
      program: program._id,
      department: department._id,
      subject: subject._id,
      semester: semesterNum,
      section: section as string,
    };

    // 4. Add date range to match query
    const startDate = new Date(date as string);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date as string);
    endDate.setUTCHours(23, 59, 59, 999);
    matchQuery.date = { $gte: startDate, $lte: endDate };

    // 5. Find records
    const records = await AttendanceRecord.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "students", // Make sure this matches your actual collection name
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      { $sort: { "student.enrollment": 1 } }, // Sort by enrollment number
      {
        $project: {
          _id: 1,
          status: 1,
          date: 1,
          markedBy: 1,
          program: 1,
          department: 1,
          subject: 1,
          semester: 1,
          section: 1,
          student: {
            _id: "$student._id",
            name: "$student.name",
            enrollment: "$student.enrollment",
            scholarNo: "$student.scholarNo",
            section: "$student.section",
          },
        },
      },
    ]);

    // 6. Handle "Not Found"
    if (!records || records.length === 0) {
      throw new ApiError(404, "No session details found for this date.");
    }

    // 7. Send success response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { records },
          "Session details retrieved successfully"
        )
      );
  }
);
