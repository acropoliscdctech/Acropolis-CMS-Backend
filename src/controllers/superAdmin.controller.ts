import { Request, Response } from "express";
import ApiResponse from "../utils/response";
import ApiError from "../utils/error";
import asyncHandler from "../utils/async-handler";
import { SuperAdmin } from "../models/superAdmin.model";
import { Faculty } from "../models/faculty.model";
import { Student } from "../models/student.model";
import { Department } from "../models/department.model";
import { AcademicProgram } from "../models/academicProgram.model";
import { Subject } from "../models/subject.model";
import { AttendanceRecord } from "../models/attendanceRecord.model";
import { AttendanceSummary } from "../models/attendanceSummary.model";
import { AuthenticatedSuperAdminRequest } from "../middlewares/superAdmin.middleware";
import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { sendFacultyPasswordResetEmail } from "../utils/brevo";
import {
  StudentImportInput,
  validateStudentImportRows,
} from "../utils/studentImport";
import { upgradeStudents } from "../migration/semester.update";

const getPagination = (query: Request["query"]) => {
  const requestedPage = Number.parseInt(query.page as string, 10);
  const requestedLimit = Number.parseInt(query.limit as string, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 50;
  const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
  return { page, limit, skip: (page - 1) * limit };
};

// DASHBOARD STATS
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    const [
      facultyCount,
      studentCount,
      departmentCount,
      programCount,
      subjectCount,
    ] = await Promise.all([
      Faculty.countDocuments(),
      Student.countDocuments(),
      Department.countDocuments(),
      AcademicProgram.countDocuments(),
      Subject.countDocuments(),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          faculties: facultyCount,
          students: studentCount,
          departments: departmentCount,
          programs: programCount,
          subjects: subjectCount,
        },
        "Dashboard statistics fetched successfully",
      ),
    );
  },
);

// ==========================================
// FACULTY MANAGEMENT
// ==========================================
export const getAllFaculties = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req.query);
    const search = (req.query.search as string) || "";

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    const [faculties, total] = await Promise.all([
      Faculty.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Faculty.countDocuments(query),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          faculties,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        "Faculties fetched successfully",
      ),
    );
  },
);

export const getFacultyById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const faculty = await Faculty.findById(id).select("-password");
    if (!faculty) {
      throw new ApiError(404, "Faculty not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, { faculty }, "Faculty fetched successfully"));
  },
);

export const createFaculty = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, username, password, designation } = req.body;

    if (!name || !email || !username || !password || !designation) {
      throw new ApiError(400, "All faculty fields are required");
    }

    const existingFaculty = await Faculty.findOne({
      $or: [{ email: email.trim() }, { username: username.trim() }],
    });

    if (existingFaculty) {
      throw new ApiError(
        409,
        "Faculty with this email or username already exists",
      );
    }

    const newFaculty = await Faculty.create({
      name: name.trim(),
      email: email.trim(),
      username: username.trim(),
      password,
      designation: designation.trim(),
    });

    const facultyResponse = await Faculty.findById(newFaculty._id).select(
      "-password",
    );

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { faculty: facultyResponse },
          "Faculty created successfully",
        ),
      );
  },
);

export const updateFaculty = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, username, designation } = req.body;

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      throw new ApiError(404, "Faculty not found");
    }

    if (email && email.trim() !== faculty.email) {
      const emailExists = await Faculty.findOne({
        email: email.trim(),
        _id: { $ne: id },
      });
      if (emailExists) {
        throw new ApiError(409, "Email is already taken by another faculty");
      }
      faculty.email = email.trim();
    }

    if (username && username.trim() !== faculty.username) {
      const usernameExists = await Faculty.findOne({
        username: username.trim(),
        _id: { $ne: id },
      });
      if (usernameExists) {
        throw new ApiError(409, "Username is already taken by another faculty");
      }
      faculty.username = username.trim();
    }

    if (name) faculty.name = name.trim();
    if (designation) faculty.designation = designation.trim();

    await faculty.save();

    const updatedFaculty = await Faculty.findById(id).select("-password");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { faculty: updatedFaculty },
          "Faculty updated successfully",
        ),
      );
  },
);

export const resetFacultyPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const faculty = await Faculty.findById(id);
    if (!faculty) {
      throw new ApiError(404, "Faculty not found");
    }

    const frontendUrl = process.env.FRONTEND_URL?.trim().replace(/\/+$/, "");
    if (!frontendUrl) {
      throw new ApiError(500, "FRONTEND_URL is not configured on the server");
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    faculty.set({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    await faculty.save();

    const resetLink = `${frontendUrl}/reset-password#token=${rawToken}`;
    try {
      await sendFacultyPasswordResetEmail({
        email: faculty.email,
        name: faculty.name,
        resetLink,
      });
    } catch (error) {
      await Faculty.updateOne(
        { _id: faculty._id, passwordResetTokenHash: tokenHash },
        { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
      );
      throw new ApiError(
        502,
        "Could not send the password reset email. Check the Brevo configuration and try again.",
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset link sent to faculty email"));
  },
);

export const deleteFaculty = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const faculty = await Faculty.findByIdAndDelete(id);
    if (!faculty) {
      throw new ApiError(404, "Faculty not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Faculty deleted successfully"));
  },
);

// ==========================================
// STUDENT MANAGEMENT
// ==========================================
export const advanceStudentSemesters = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.body?.confirmation !== "ADVANCE SEMESTER") {
      throw new ApiError(400, 'Type "ADVANCE SEMESTER" to confirm this operation');
    }

    const result = await upgradeStudents();
    return res.status(200).json(
      new ApiResponse(200, result, "Student semesters advanced successfully"),
    );
  },
);

export const previewStudentImport = asyncHandler(
  async (req: Request, res: Response) => {
    const rows = req.body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new ApiError(400, "The spreadsheet does not contain any student rows");
    }
    const preview = await validateStudentImportRows(rows as StudentImportInput[]);
    return res
      .status(200)
      .json(new ApiResponse(200, preview, "Student import preview ready"));
  },
);

export const commitStudentImport = asyncHandler(
  async (req: Request, res: Response) => {
    const rows = req.body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new ApiError(400, "There are no valid student rows to import");
    }
    const { results } = await validateStudentImportRows(rows as StudentImportInput[]);
    const validRows = results.filter((result) => result.errors.length === 0);
    const failed = results
      .filter((result) => result.errors.length > 0)
      .map((result) => ({
        rowNumber: result.rowNumber,
        enrollment: result.source.enrollment,
        reason: result.errors.join(" "),
      }));

    if (!validRows.length) {
      return res.status(200).json(
        new ApiResponse(200, { imported: 0, failed }, "No student rows were imported"),
      );
    }

    const operations = validRows.map((result) => ({
      insertOne: { document: result.normalized },
    }));

    let writeErrors: any[] = [];
    let insertedCount = validRows.length;
    try {
      const writeResult = await Student.bulkWrite(operations as any, { ordered: false });
      insertedCount = writeResult.insertedCount;
    } catch (error: any) {
      writeErrors = error?.writeErrors || error?.result?.getWriteErrors?.() || [];
      if (!writeErrors.length) throw error;
      insertedCount = Math.max(0, validRows.length - writeErrors.length);
    }

    failed.push(...writeErrors.map((writeError) => {
      const sourceRow = validRows[writeError.index];
      return {
        rowNumber: sourceRow?.rowNumber,
        enrollment: sourceRow?.source.enrollment,
        reason:
          writeError.code === 11000
            ? "Enrollment already exists in the student database."
            : writeError.errmsg || "This row could not be saved.",
      };
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        { imported: insertedCount, failed },
        "Student import finished",
      ),
    );
  },
);

export const getAllStudents = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req.query);
    const search = (req.query.search as string) || "";
    const department = req.query.department as string;
    const program = req.query.program as string;
    const semester = req.query.semester as string;
    const section = req.query.section as string;
    const status = req.query.status as string;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { enrollment: { $regex: search, $options: "i" } },
      ];
    }

    if (department) query.department = department;
    if (program) query.program = program;
    if (semester) query.semester = Number(semester);
    if (section) query.section = section;
    if (status) query.status = status;

    const [students, total] = await Promise.all([
      Student.find(query)
        .populate("department", "name shortName")
        .populate("program", "name shortName")
        .sort({ enrollment: 1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(query),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          students,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        "Students fetched successfully",
      ),
    );
  },
);

export const getStudentById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const student = await Student.findById(id)
      .populate("department", "name shortName")
      .populate("program", "name shortName");
    if (!student) {
      throw new ApiError(404, "Student not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, { student }, "Student fetched successfully"));
  },
);

export const createStudent = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      enrollment,
      section,
      semester,
      year,
      department,
      program,
      status,
    } = req.body;

    if (
      !name ||
      !enrollment ||
      !section ||
      !semester ||
      !year ||
      !department ||
      !program
    ) {
      throw new ApiError(400, "All required student fields must be provided");
    }

    const existingStudent = await Student.findOne({
      enrollment: enrollment.trim().toUpperCase(),
    });

    if (existingStudent) {
      throw new ApiError(
        409,
        "Student with this enrollment number already exists",
      );
    }

    const newStudent = await Student.create({
      name: name.trim(),
      enrollment: enrollment.trim().toUpperCase(),
      section: section.trim(),
      semester: Number(semester),
      year: Number(year),
      department,
      program,
      status: status || "active",
    });

    const populatedStudent = await Student.findById(newStudent._id)
      .populate("department", "name shortName")
      .populate("program", "name shortName");

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { student: populatedStudent },
          "Student created successfully",
        ),
      );
  },
);

export const updateStudent = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      name,
      enrollment,
      section,
      semester,
      year,
      department,
      program,
      status,
    } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    if (enrollment && enrollment.trim().toUpperCase() !== student.enrollment) {
      const existing = await Student.findOne({
        enrollment: enrollment.trim().toUpperCase(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new ApiError(
          409,
          "Enrollment number is already in use by another student",
        );
      }
      student.enrollment = enrollment.trim().toUpperCase();
    }

    if (name) student.name = name.trim();
    if (section) student.section = section.trim();
    if (semester !== undefined) student.semester = Number(semester);
    if (year !== undefined) student.year = Number(year);
    if (department) student.department = department;
    if (program) student.program = program;
    if (status) student.status = status;

    await student.save();

    const updatedStudent = await Student.findById(id)
      .populate("department", "name shortName")
      .populate("program", "name shortName");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { student: updatedStudent },
          "Student updated successfully",
        ),
      );
  },
);

export const deleteStudent = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Student deleted successfully"));
  },
);

// ==========================================
// DEPARTMENT MANAGEMENT
// ==========================================
export const getAllDepartments = asyncHandler(
  async (req: Request, res: Response) => {
    const departments = await Department.find().sort({ name: 1 });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { departments },
          "Departments fetched successfully",
        ),
      );
  },
);

export const createDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, shortName } = req.body;
    if (!name || !shortName) {
      throw new ApiError(400, "Department name and shortName are required");
    }

    const existing = await Department.findOne({
      $or: [{ name: name.trim() }, { shortName: shortName.trim() }],
    });

    if (existing) {
      throw new ApiError(
        409,
        "Department with this name or shortName already exists",
      );
    }

    const department = await Department.create({
      name: name.trim(),
      shortName: shortName.trim().toUpperCase(),
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, { department }, "Department created successfully"),
      );
  },
);

export const updateDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, shortName } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      throw new ApiError(404, "Department not found");
    }

    if (name) department.name = name.trim();
    if (shortName) department.shortName = shortName.trim().toUpperCase();

    await department.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, { department }, "Department updated successfully"),
      );
  },
);

export const deleteDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const department = await Department.findByIdAndDelete(id);
    if (!department) {
      throw new ApiError(404, "Department not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Department deleted successfully"));
  },
);

// ==========================================
// PROGRAM MANAGEMENT
// ==========================================
export const getAllPrograms = asyncHandler(
  async (req: Request, res: Response) => {
    const programs = await AcademicProgram.find().sort({ name: 1 });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { programs },
          "Academic programs fetched successfully",
        ),
      );
  },
);

export const createProgram = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, shortName, durationInYears } = req.body;
    if (!name || !shortName || !durationInYears) {
      throw new ApiError(
        400,
        "Name, shortName, and durationInYears are required",
      );
    }

    const existing = await AcademicProgram.findOne({
      $or: [{ name: name.trim() }, { shortName: shortName.trim() }],
    });

    if (existing) {
      throw new ApiError(
        409,
        "Program with this name or shortName already exists",
      );
    }

    const program = await AcademicProgram.create({
      name: name.trim(),
      shortName: shortName.trim().toUpperCase(),
      durationInYears: Number(durationInYears),
    });

    return res
      .status(201)
      .json(new ApiResponse(201, { program }, "Program created successfully"));
  },
);

export const updateProgram = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, shortName, durationInYears } = req.body;

    const program = await AcademicProgram.findById(id);
    if (!program) {
      throw new ApiError(404, "Program not found");
    }

    if (name) program.name = name.trim();
    if (shortName) program.shortName = shortName.trim().toUpperCase();
    if (durationInYears !== undefined)
      program.durationInYears = Number(durationInYears);

    await program.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { program }, "Program updated successfully"));
  },
);

export const deleteProgram = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const program = await AcademicProgram.findByIdAndDelete(id);
    if (!program) {
      throw new ApiError(404, "Program not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Program deleted successfully"));
  },
);

// ==========================================
// SUBJECT MANAGEMENT
// ==========================================
export const getAllSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const subjects = await Subject.find().sort({ title: 1 });
    return res
      .status(200)
      .json(
        new ApiResponse(200, { subjects }, "Subjects fetched successfully"),
      );
  },
);

export const createSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { title, subjectCode } = req.body;
    if (!title || !subjectCode) {
      throw new ApiError(400, "Subject title and subjectCode are required");
    }

    const existing = await Subject.findOne({
      subjectCode: subjectCode.trim().toUpperCase(),
    });

    if (existing) {
      throw new ApiError(409, "Subject with this subjectCode already exists");
    }

    const subject = await Subject.create({
      title: title.trim(),
      subjectCode: subjectCode.trim().toUpperCase(),
    });

    return res
      .status(201)
      .json(new ApiResponse(201, { subject }, "Subject created successfully"));
  },
);

export const updateSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, subjectCode } = req.body;

    const subject = await Subject.findById(id);
    if (!subject) {
      throw new ApiError(404, "Subject not found");
    }

    if (
      subjectCode &&
      subjectCode.trim().toUpperCase() !== subject.subjectCode
    ) {
      const existing = await Subject.findOne({
        subjectCode: subjectCode.trim().toUpperCase(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new ApiError(
          409,
          "Subject code is already in use by another subject",
        );
      }
      subject.subjectCode = subjectCode.trim().toUpperCase();
    }

    if (title) subject.title = title.trim();

    await subject.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { subject }, "Subject updated successfully"));
  },
);

export const deleteSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) {
      throw new ApiError(404, "Subject not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Subject deleted successfully"));
  },
);
