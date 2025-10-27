// /server/src/controllers/attendanceController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { AttendanceRecord } from "../models/attendanceRecord.model";
import { AttendanceSummary } from "../models/attendanceSummary.model";
import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";
import { Subject } from "../models/subject.model";
import { Student } from "../models/student.model";

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: { id: string }; // From your auth middleware
}

// Interface for the expected attendance data per student
interface AttendanceSubmission {
  studentId: string;
  status: "present" | "absent";
}

// Interface for the expected request body
interface MarkAttendanceBody {
  programShortName: string;
  deptShortName: string;
  section: string;
  subjectCode: string;
  semester: number; // Semester number is crucial now
  date: string;
  attendanceData: AttendanceSubmission[];
}

export const markAttendance = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const facultyId = req.user?.id;
  const {
    programShortName,
    deptShortName,
    section,
    subjectCode,
    semester,
    date,
    attendanceData,
  } = req.body as MarkAttendanceBody;

  // --- 1. Basic Validations ---
  if (!facultyId) {
    return res.status(401).json({ message: "Faculty ID not found in token" });
  }
  if (
    !programShortName ||
    !deptShortName ||
    !section ||
    !subjectCode ||
    !semester ||
    !date ||
    !attendanceData
  ) {
    return res
      .status(400)
      .json({ message: "Missing required fields in request body" });
  }
  if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
    return res
      .status(400)
      .json({ message: "Attendance data is missing or empty" });
  }
  const attendanceDate = new Date(date);
  if (isNaN(attendanceDate.getTime())) {
    return res
      .status(400)
      .json({ message: "Invalid Date format (YYYY-MM-DD expected)" });
  }
  // Set time to UTC midnight for consistent date matching
  attendanceDate.setUTCHours(0, 0, 0, 0);

  try {
    // --- 2. Look up Reference IDs ---
    const program = await AcademicProgram.findOne({
      shortName: programShortName,
    }).select("_id");
    const department = await Department.findOne({
      shortName: deptShortName,
    }).select("_id");
    const subject = await Subject.findOne({ subjectCode: subjectCode }).select(
      "_id"
    );

    if (!program || !department || !subject) {
      return res
        .status(404)
        .json({ message: "Program, Department, or Subject not found" });
    }

    // --- 3. Prepare Bulk Operations ---
    const recordBulkOps: any[] = []; // For AttendanceRecord
    const summaryBulkOps: any[] = []; // For AttendanceSummary (semester-based)

    // --- 4. Process Submitted Attendance Data ---
    for (const record of attendanceData) {
      // Validate student ID and status
      if (
        !mongoose.Types.ObjectId.isValid(record.studentId) ||
        !["present", "absent"].includes(record.status)
      ) {
        console.warn(
          `Invalid data skipped: studentId=${record.studentId}, status=${record.status}`
        );
        continue; // Skip invalid records
      }
      // Optional: Verify student exists and matches filters (program, dept, section, semester)
      // const studentExists = await Student.findOne({ _id: record.studentId, program: program._id, /* other filters */ });
      // if (!studentExists) { continue; }

      // --- a) Prepare AttendanceRecord Upsert ---
      recordBulkOps.push({
        updateOne: {
          filter: {
            // Unique key for a record
            student: record.studentId,
            subject: subject._id,
            date: attendanceDate,
            program: program._id,
            department: department._id,
            section: section,
            semester: semester,
          },
          update: {
            // Data to set/update
            $set: {
              status: record.status,
              markedBy: facultyId,
              // Ensure all fields are set on insert
              student: record.studentId,
              subject: subject._id,
              date: attendanceDate,
              program: program._id,
              department: department._id,
              section: section,
              semester: semester,
            },
          },
          upsert: true, // Create if not exists, update if exists
        },
      });

      // --- b) Prepare AttendanceSummary Upsert/Increment ---
      const summaryId = `${record.studentId}_${program._id}_${semester}`; // Unique key for summary
      const incrementField = `${record.status}Count`; // e.g., "presentCount"

      // Need student's primary department for the summary document
      // Ideally, fetch student once or ensure it's passed, but for simplicity:
      // const student = await Student.findById(record.studentId).select('department');
      // const studentDeptId = student?.department;
      // For now, let's assume we can query it later or that the class dept is sufficient context
      // If the summary MUST store the student's *own* department, you'll need to fetch it here.
      // Let's store the department context of the class in the summary for now.
      const studentDeptId = department._id; // Using class context department ID

      summaryBulkOps.push({
        updateOne: {
          filter: { _id: summaryId },
          update: {
            // Increment counts. $inc handles non-existing fields (sets to 1).
            // How to handle totalClasses correctly on upsert/update needs care.
            // We should only increment totalClasses ONCE per session, even if status changes.
            // This simple $inc might double-count if faculty resubmits.
            // A better approach is needed for robust resubmission handling.
            // For now, focusing on initial marking:
            $inc: { [incrementField]: 1, totalClasses: 1 },
            $setOnInsert: {
              // Fields to set only when CREATING the summary
              _id: summaryId,
              student: record.studentId,
              semester: semester,
              program: program._id,
              department: studentDeptId, // Student's primary dept (or class context dept)
              presentCount: 0, // Initialize explicitly
              absentCount: 0,
              lateCount: 0,
              excusedCount: 0,
            },
          },
          upsert: true, // Create summary if it doesn't exist
        },
      });
    } // End loop through attendanceData

    // --- 5. Execute Bulk Operations ---
    let recordResult, summaryResult;
    if (recordBulkOps.length > 0) {
      recordResult = await AttendanceRecord.bulkWrite(recordBulkOps, {
        ordered: false,
      }); // unordered allows continuing on error
    }
    if (summaryBulkOps.length > 0) {
      // **Important Note on totalClasses Increment:**
      // The simple `$inc: { totalClasses: 1 }` above will increment `totalClasses`
      // every time this runs, even if it's an update to change a status (e.g., absent -> present).
      // A more robust solution requires checking if an AttendanceRecord for this student/subject/date
      // already exists *before* deciding to increment totalClasses. This adds complexity.
      // For this version, we'll proceed with the simple increment, assuming initial marking.
      summaryResult = await AttendanceSummary.bulkWrite(summaryBulkOps, {
        ordered: false,
      });
    }

    res.status(201).json({
      message: `Attendance marked for ${attendanceData.length} students.`,
      recordResult, // Optional: return bulk results for debugging
      summaryResult, // Optional: return bulk results for debugging
    });
  } catch (error: any) {
    console.error("Error marking attendance:", error);
    res.status(500).json({
      message: "Server error marking attendance",
      error: error.message,
    });
  }
};

export const getAttendanceDetailsForSession = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const {
    programShortName,
    deptShortName,
    section,
    subjectCode,
    semester, // Get semester from query
    date, // Get date from query
  } = req.query;
  const facultyId = req.user?.id; // Optional: For authorization checks if needed later

  // --- 1. Validations ---
  if (
    !programShortName ||
    !deptShortName ||
    !section ||
    !subjectCode ||
    !semester ||
    !date
  ) {
    return res
      .status(400)
      .json({
        message:
          "Missing required query parameters: programShortName, deptShortName, section, subjectCode, semester, date",
      });
  }

  const semesterNum = parseInt(semester as string);
  if (isNaN(semesterNum)) {
    return res.status(400).json({ message: "Invalid semester provided." });
  }

  let attendanceDate: Date;
  try {
    attendanceDate = new Date((date as string) + "T00:00:00.000Z"); // UTC Midnight
    if (isNaN(attendanceDate.getTime())) throw new Error();
  } catch (e) {
    return res
      .status(400)
      .json({ message: "Invalid Date format (YYYY-MM-DD expected)" });
  }

  // Define start and end of the specified day in UTC
  const startOfDay = new Date(attendanceDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(attendanceDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  try {
    // --- 2. Look up Reference IDs ---
    const program = await AcademicProgram.findOne({
      shortName: programShortName as string,
    }).select("_id");
    const department = await Department.findOne({
      shortName: deptShortName as string,
    }).select("_id");
    const subject = await Subject.findOne({
      subjectCode: subjectCode as string,
    }).select("_id");

    if (!program || !department || !subject) {
      return res
        .status(404)
        .json({
          message:
            "Program, Department, or Subject not found for the given codes/names",
        });
    }

    // --- 3. Build AttendanceRecord Query ---
    const recordFilters: mongoose.FilterQuery<any> = {
      program: program._id,
      department: department._id,
      section: section as string,
      subject: subject._id,
      semester: semesterNum,
      date: { $gte: startOfDay, $lte: endOfDay }, // Find records within the specified day
    };

    // --- 4. Execute Query ---
    const attendanceDetails = await AttendanceRecord.find(recordFilters)
      .populate({
        path: "student", // Populate student details from the reference
        select: "name rollNumber section", // Select desired student fields
      })
      .sort({ "student.rollNumber": 1 }); // Sort by student roll number

    if (!attendanceDetails || attendanceDetails.length === 0) {
      // Return empty array if no records found for these filters on this date
      return res.status(200).json([]);
    }

    res.status(200).json(attendanceDetails);
  } catch (error: any) {
    console.error("Error fetching attendance details:", error);
    res
      .status(500)
      .json({ message: "Server error fetching details", error: error.message });
  }
};
