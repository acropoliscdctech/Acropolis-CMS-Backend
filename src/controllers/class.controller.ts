import mongoose from "mongoose";
import { Request, Response } from "express";
import { Class } from "../models/class.model";
import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export const getMyClasses = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const facultyId = req.user?.id;
  if (!facultyId) {
    return res
      .status(401)
      .json({ message: "Not authorized, faculty ID missing" });
  }

  const filters: mongoose.FilterQuery<any> = {
    faculty: facultyId,
  };

  const { programShortName, deptShortName, semester, academicYear, section } =
    req.query;

  try {
    if (programShortName) {
      const program = await AcademicProgram.findOne({
        shortName: programShortName as string,
      }).select("_id");
      if (program) filters.program = program._id;
      else
        return res
          .status(404)
          .json({ message: `Program ${programShortName} not found` });
    }
    if (deptShortName) {
      const department = await Department.findOne({
        shortName: deptShortName as string,
      }).select("_id");
      if (department) filters.department = department._id;
      else
        return res
          .status(404)
          .json({ message: `Department ${deptShortName} not found` });
    }
    if (semester) filters.semester = parseInt(semester as string);
    if (academicYear) filters.academicYear = academicYear as string;
    if (section) filters.section = section as string;

    // --- 3. Execute Query ---
    const classes = await Class.find(filters)
      .populate({ path: "subject", select: "subjectCode title" })
      .populate({ path: "department", select: "shortName name" })
      .populate({ path: "program", select: "shortName name" })
      .sort({ academicYear: -1, semester: 1, section: 1 });

    res.status(200).json(classes);
  } catch (error: any) {
    console.error("Error fetching faculty classes:", error);
    res
      .status(500)
      .json({ message: "Server error fetching classes", error: error.message });
  }
};

export const getClassStudents = async (req: Request, res: Response) => {
  const { classId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({ message: "Invalid Class ID format" });
  }

  try {
    const classData = await Class.findById(classId).populate({
      path: "students",
      select: "name rollNumber section email",
      options: { sort: { rollNumber: 1 } },
    });

    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.status(200).json(classData.students);
  } catch (error: any) {
    console.error("Error fetching class students:", error);
    res.status(500).json({
      message: "Server error fetching students",
      error: error.message,
    });
  }
};
