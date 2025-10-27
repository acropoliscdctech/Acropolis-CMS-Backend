import { Request, Response } from 'express';
import mongoose from 'mongoose';

import ApiResponse from '../utils/response';
import ApiError from '../utils/error';
import asyncHandler from '../utils/async-handler';

import { IFaculty } from '../models/faculty.model';
import { AttendanceRecord } from '../models/attendanceRecord.model';
import { AcademicProgram } from '../models/academicProgram.model';
import { Department } from '../models/department.model';
import { Subject } from '../models/subject.model';

interface AuthenticatedRequest extends Request {
  user?: IFaculty;
}

export const getFacultyHistoryFilters = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // 1. Get Faculty ID from auth middleware
    const facultyId = req.user?._id;

    if (!facultyId) {
      throw new ApiError(401, 'User not authenticated.');
    }

    // 2. Aggregate to find unique combinations
    const filters = await AttendanceRecord.aggregate([
      {
        $match: { markedBy: facultyId },
      },
      {
        // Group by all the class identifiers
        $group: {
          _id: {
            program: '$program',
            department: '$department',
            semester: '$semester',
            section: '$section',
            subject: '$subject',
          },
        },
      },
      {
        // Populate the human-readable names for each ID
        $lookup: {
          from: 'academicprograms', // The actual collection name in MongoDB
          localField: '_id.program',
          foreignField: '_id',
          as: 'program',
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id.department',
          foreignField: '_id',
          as: 'department',
        },
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id.subject',
          foreignField: '_id',
          as: 'subject',
        },
      },
      {
        $project: {
          _id: 0,
          program: { $arrayElemAt: ['$program', 0] },
          department: { $arrayElemAt: ['$department', 0] },
          subject: { $arrayElemAt: ['$subject', 0] },
          semester: '$_id.semester',
          section: '$_id.section',
        },
      },
    ]);

    // 3. Handle "Not Found"
    if (!filters || filters.length === 0) {
      throw new ApiError(404, 'No attendance history found for this faculty.');
    }

    // 4. Send success response
    return res
      .status(200)
      .json(
        new ApiResponse(200, { filters }, 'History filters retrieved successfully')
      );
  }
);

export const getHistorySummary = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Get and validate query parameters (now as strings)
    const {
      programShortName,
      deptShortName,
      subjectCode,
      semester,
      section,
    } = req.query;

    const filters = {
      programShortName,
      deptShortName,
      subjectCode,
      semester,
      section,
    };
    const requiredFields = [
      'programShortName',
      'deptShortName',
      'subjectCode',
      'semester',
      'section',
    ];

    for (const field of requiredFields) {
      const value = filters[field as keyof typeof filters];
      if (!value) {
        throw new ApiError(400, `Query parameter '${field}' is required.`);
      }
      if (typeof value !== 'string') {
        throw new ApiError(
          400,
          `Query parameter '${field}' must be a string.`
        );
      }
    }

    // 2. Look up reference IDs
    const program = await AcademicProgram.findOne({
      shortName: programShortName as string,
    })
      .select('_id')
      .lean();
    const department = await Department.findOne({
      shortName: deptShortName as string,
    })
      .select('_id')
      .lean();
    const subject = await Subject.findOne({
      subjectCode: subjectCode as string,
    })
      .select('_id')
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

    // 3. Build the match query
    const matchQuery: { [key: string]: any } = {
      program: program._id,
      department: department._id,
      subject: subject._id,
      semester: semesterNum,
      section: section as string,
    };

    // 4. Aggregate to group by date
    const summary = await AttendanceRecord.aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          date: { $first: '$date' },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] },
          },
          leaveCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Leave'] }, 1, 0] },
          },
          totalMarked: { $sum: 1 },
        },
      },
      {
        $sort: { date: -1 }, // Show most recent sessions first
      },
    ]);

    // 5. Handle "Not Found"
    if (!summary || summary.length === 0) {
      throw new ApiError(404, 'No summary found for these filters.');
    }

    // 6. Send success response
    return res
      .status(200)
      .json(
        new ApiResponse(200, { summary }, 'History summary retrieved successfully')
      );
  }
);

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
      'programShortName',
      'deptShortName',
      'subjectCode',
      'semester',
      'section',
      'date',
    ];

    for (const field of requiredFields) {
      const value = filters[field as keyof typeof filters];
      if (!value) {
        throw new ApiError(400, `Query parameter '${field}' is required.`);
      }
      if (typeof value !== 'string') {
        throw new ApiError(
          400,
          `Query parameter '${field}' must be a string.`
        );
      }
    }

    // 2. Look up reference IDs
    const program = await AcademicProgram.findOne({
      shortName: programShortName as string,
    })
      .select('_id')
      .lean();
    const department = await Department.findOne({
      shortName: deptShortName as string,
    })
      .select('_id')
      .lean();
    const subject = await Subject.findOne({
      subjectCode: subjectCode as string,
    })
      .select('_id')
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
    const records = await AttendanceRecord.find(matchQuery)
      .populate('student', 'name enrollment scholarNo')
      .sort({ 'student.name': 1 })
      .lean();

    // 6. Handle "Not Found"
    if (!records || records.length === 0) {
      throw new ApiError(404, 'No session details found for this date.');
    }

    // 7. Send success response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { records },
          'Session details retrieved successfully'
        )
      );
  }
);