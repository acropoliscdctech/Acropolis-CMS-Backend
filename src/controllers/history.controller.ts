import { Request, Response } from 'express';
import mongoose from 'mongoose';

// Import your custom utilities
import ApiResponse from '../utils/response';
import ApiError from '../utils/error';
import asyncHandler from '../utils/async-handler';

// Import Models
import { IFaculty } from '../models/faculty.model';
import {AttendanceRecord} from '../models/attendanceRecord.model';

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
      // Note: Add more $lookups if 'semester' and 'section' are collections
      {
        $project: {
          _id: 0,
          // Extract the first (and only) element from the populated arrays
          program: { $arrayElemAt: ['$program', 0] },
          department: { $arrayElemAt: ['$department', 0] },
          subject: { $arrayElemAt: ['$subject', 0] },
          // Pass through the original IDs if they aren't populated
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
        new ApiResponse(200, {filters}, 'History filters retrieved successfully')
      );
  }
);

export const getHistorySummary = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Get and validate query parameters
    const { program, department, semester, section, subject } = req.query;

    // --- FIX: Robust validation for all query parameters ---
    const filters = { program, department, semester, section, subject };
    const requiredFields = [
      'program',
      'department',
      'semester',
      'section',
      'subject',
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
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new ApiError(
          400,
          `Query parameter '${field}' is not a valid ObjectId.`
        );
      }
    }

    // 2. Build the match query (now we know they are valid strings)
    const matchQuery: { [key: string]: any } = {
      program: new mongoose.Types.ObjectId(program as string),
      department: new mongoose.Types.ObjectId(department as string),
      semester: new mongoose.Types.ObjectId(semester as string),
      section: new mongoose.Types.ObjectId(section as string),
      subject: new mongoose.Types.ObjectId(subject as string),
    };

    // 3. Aggregate to group by date
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

    // 4. Handle "Not Found"
    if (!summary || summary.length === 0) {
      throw new ApiError(404, 'No summary found for these filters.');
    }

    // 5. Send success response
    return res
      .status(200)
      .json(
        new ApiResponse(200, {summary}, 'History summary retrieved successfully')
      );
  }
);

export const getHistorySessionDetails = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Get and validate query parameters
    const {
      program,
      department,
      semester,
      section,
      subject,
      date,
    } = req.query;

    const filters = { program, department, semester, section, subject, date };
    const requiredFields = [
      'program',
      'department',
      'semester',
      'section',
      'subject',
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
      // Validate IDs, but skip 'date' field
      if (field !== 'date' && !mongoose.Types.ObjectId.isValid(value)) {
        throw new ApiError(
          400,
          `Query parameter '${field}' is not a valid ObjectId.`
        );
      }
      // Basic validation for date string
      if (field === 'date' && !/\d{4}-\d{2}-\d{2}/.test(value)) {
        throw new ApiError(
          400,
          `Query parameter 'date' must be in YYYY-MM-DD format.`
        );
      }
    }

    // 2. Build the match query
    const matchQuery: { [key: string]: any } = {
      program: new mongoose.Types.ObjectId(program as string),
      department: new mongoose.Types.ObjectId(department as string),
      semester: new mongoose.Types.ObjectId(semester as string),
      section: new mongoose.Types.ObjectId(section as string),
      subject: new mongoose.Types.ObjectId(subject as string),
    };

    // 3. Add date range to match query
    const startDate = new Date(date as string);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date as string);
    endDate.setUTCHours(23, 59, 59, 999);
    matchQuery.date = { $gte: startDate, $lte: endDate };

    // 4. Find records
    const records = await AttendanceRecord.find(matchQuery)
      .populate('student', 'name enrollment scholarNo')
      .sort({ 'student.name': 1 });

    // 5. Handle "Not Found"
    if (!records || records.length === 0) {
      throw new ApiError(404, 'No session details found for this date.');
    }

    // 6. Send success response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {records},
          'Session details retrieved successfully'
        )
      );
  }
);
