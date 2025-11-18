import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import ApiResponse from "../utils/response";
import ApiError from "../utils/error";
import mongoose from "mongoose";
import { AttendanceRecord } from "../models/attendanceRecord.model";
import { AttendanceSummary } from "../models/attendanceSummary.model";
import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";
import { Subject } from "../models/subject.model";
import { TimeSlot } from "../models/timeSlot.model";
import { Student } from "../models/student.model";

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

interface AttendanceSubmission {
  studentId: string;
  status: "present" | "absent";
}

interface MarkAttendanceBody {
  programShortName: string;
  deptShortName: string;
  section: string;
  subjectCode: string;
  semester: number;
  date: string;
  timeSlotId: string; // <-- 2. Add timeSlotId
  attendanceData: AttendanceSubmission[];
}

// mark attendance controller
export const markAttendance = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // --- 1. Get Data & Validate User ---
    const facultyId = req.user?.id;
    if (!facultyId) {
      throw new ApiError(401, "Faculty ID not found in token");
    }

    const {
      programShortName,
      deptShortName,
      section,
      subjectCode,
      semester,
      date,
      timeSlotId,
      attendanceData,
    } = req.body as MarkAttendanceBody;

    // --- 2. Full Body Validation ---
    if (
      [
        programShortName,
        deptShortName,
        section,
        subjectCode,
        semester,
        date,
        timeSlotId,
      ].some((field) => !field)
    ) {
      throw new ApiError(400, "Missing required fields in request body");
    }
    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
      throw new ApiError(400, "Attendance data is missing or empty");
    }
    if (!mongoose.Types.ObjectId.isValid(timeSlotId)) {
      throw new ApiError(400, "Invalid TimeSlot ID format");
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      throw new ApiError(400, "Invalid Date format (YYYY-MM-DD expected)");
    }
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // --- 3. Look up All Reference IDs Concurrently ---
    const [program, department, subject, timeSlot] = await Promise.all([
      AcademicProgram.findOne({ shortName: programShortName })
        .select("_id")
        .lean(),
      Department.findOne({ shortName: deptShortName }).select("_id").lean(),
      Subject.findOne({ subjectCode: subjectCode }).select("_id").lean(),
      TimeSlot.findById(timeSlotId).select("_id").lean(),
    ]);

    // Check if any reference is missing
    if (!program) throw new ApiError(404, "Program not found");
    if (!department) throw new ApiError(404, "Department not found");
    if (!subject) throw new ApiError(404, "Subject not found");
    if (!timeSlot) throw new ApiError(404, "TimeSlot not found");

    // --- 4. Prepare Bulk Operations ---
    const recordBulkOps: any[] = [];
    const summaryUpdatesMap = new Map<string, any>();
    const countedForTotalClasses = new Set<string>();

    for (const record of attendanceData) {
      if (
        !mongoose.Types.ObjectId.isValid(record.studentId) ||
        !["present", "absent"].includes(record.status)
      ) {
        console.warn(
          `Invalid data skipped: studentId=${record.studentId}, status=${record.status}`
        );
        continue;
      }

      recordBulkOps.push({
        updateOne: {
          filter: {
            student: record.studentId,
            subject: subject._id,
            date: attendanceDate,
            timeSlot: timeSlot._id,
            program: program._id,
            department: department._id,
            section: section,
            semester: semester,
          },
          update: {
            $set: {
              status: record.status,
              markedBy: facultyId,
              student: record.studentId,
              subject: subject._id,
              date: attendanceDate,
              program: program._id,
              department: department._id,
              section: section,
              semester: semester,
              timeSlot: timeSlot._id,
            },
          },
          upsert: true,
        },
      });

      const summaryId = `${record.studentId}_${program._id}_${semester}`;
      const incrementField = `${record.status}Count`;

      const studentDeptId = department._id;

      if (!summaryUpdatesMap.has(summaryId)) {
        summaryUpdatesMap.set(summaryId, {
          filter: { _id: summaryId },
          update: {
            $inc: { totalClasses: 0 },
            $setOnInsert: {
              _id: summaryId,
              student: record.studentId,
              semester: semester,
              program: program._id,
              department: studentDeptId,
            },
          },
          upsert: true,
        });
      }

      const updateOp = summaryUpdatesMap.get(summaryId).update;
      updateOp.$inc[incrementField] = (updateOp.$inc[incrementField] || 0) + 1;

      if (!countedForTotalClasses.has(record.studentId)) {
        updateOp.$inc.totalClasses = (updateOp.$inc.totalClasses || 0) + 1;
        countedForTotalClasses.add(record.studentId);
      }
    }

    let recordResult, summaryResult;
    const finalSummaryBulkOps = Array.from(summaryUpdatesMap.values()).map(
      (op) => ({ updateOne: op })
    );

    if (recordBulkOps.length > 0) {
      recordResult = await AttendanceRecord.bulkWrite(recordBulkOps, {
        ordered: false,
      });
    }
    if (finalSummaryBulkOps.length > 0) {
      summaryResult = await AttendanceSummary.bulkWrite(finalSummaryBulkOps, {
        ordered: false,
      });
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          marked: attendanceData.length,
          recordResult,
          summaryResult,
        },
        "Attendance marked successfully"
      )
    );
  }
);

// get attendance summary for student controller
export const getAttendanceSummaryForStudents = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { programShortName, deptShortName, year, semester, section } =
      req.query;

    if (!programShortName || !deptShortName || !year || !semester || !section) {
      throw new ApiError(
        400,
        "Missing required query parameters: programShortName, deptShortName, year, semester, and section"
      );
    }
    const yearNum = parseInt(year as string);
    const semesterNum = parseInt(semester as string);
    if (isNaN(yearNum) || isNaN(semesterNum)) {
      throw new ApiError(400, "Invalid year or semester provided.");
    }
    const program = await AcademicProgram.findOne({
      shortName: programShortName as string,
    }).select("_id");
    const department = await Department.findOne({
      shortName: deptShortName as string,
    }).select("_id");
    if (!program || !department) {
      throw new ApiError(404, "Program or Department not found");
    }
    const studentFilters: mongoose.FilterQuery<any> = {
      program: program._id,
      department: department._id,
      year: yearNum,
      semester: semesterNum,
      section: section as string,
      status: "active",
    };
    const students = await Student.find(studentFilters)
      .select("name enrollment email section")
      .lean();
    if (!students || students.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No students found"));
    }
    const studentIds = students.map((s) => s._id);
    const summaries = await AttendanceSummary.find({
      student: { $in: studentIds },
      semester: semesterNum,
    }).lean();
    const summaryMap = new Map(summaries.map((s) => [s.student.toString(), s]));
    const results = students.map((student) => {
      const summary = summaryMap.get(student._id.toString());
      let presentCount = 0;
      let totalClasses = 0;
      let percentage = 0;
      if (summary) {
        presentCount = summary.presentCount || 0;
        totalClasses = summary.totalClasses || 0;
        if (totalClasses > 0) {
          percentage = (presentCount / totalClasses) * 100;
        }
      }
      return {
        ...student,
        presentCount,
        absentCount: summary?.absentCount || 0,
        totalClasses,
        percentage: parseFloat(percentage.toFixed(2)),
      };
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { attendanceSummaries: results }, "Success"));
  }
);

// get history of session details controller
export const getHistorySessionDetails = asyncHandler(
  async (req: Request, res: Response) => {
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

    const semesterNum = parseInt(semester as string, 10);
    if (isNaN(semesterNum)) {
      throw new ApiError(
        400,
        'Query parameter "semester" must be a valid number.'
      );
    }

    if (date && !/\d{4}-\d{2}-\d{2}/.test(date as string)) {
      throw new ApiError(
        400,
        `Query parameter 'date' must be in YYYY-MM-DD format.`
      );
    }

    const matchQuery: { [key: string]: any } = {
      program: program._id,
      department: department._id,
      subject: subject._id,
      semester: semesterNum,
      section: section as string,
    };

    const startDate = new Date(date as string);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date as string);
    endDate.setUTCHours(23, 59, 59, 999);
    matchQuery.date = { $gte: startDate, $lte: endDate };

    const records = await AttendanceRecord.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      { $sort: { "student.enrollment": 1 } },
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

    if (!records || records.length === 0) {
      throw new ApiError(404, "No session details found for this date.");
    }

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
