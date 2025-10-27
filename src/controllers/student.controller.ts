// /server/src/controllers/studentController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Student } from "../models/student.model";
import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";

export const findStudentsByFilters = async (req: Request, res: Response) => {
  const { programShortName, year, deptShortName, section } = req.query;

  // --- Basic Validations ---
  if (!programShortName || !year || !deptShortName || !section) {
    return res.status(400).json({
      message:
        "Missing required filters: program, year, department, and section are required.",
    });
  }

  // Convert year to number and validate
  const yearNum = parseInt(year as string);
  if (isNaN(yearNum)) {
    return res.status(400).json({ message: "Invalid year provided." });
  }

  try {
    // --- 1. Look up Program and Department IDs ---
    const program = await AcademicProgram.findOne({
      shortName: programShortName as string,
    }).select("_id");
    if (!program) {
      return res
        .status(404)
        .json({ message: `Program ${programShortName} not found` });
    }

    const department = await Department.findOne({
      shortName: deptShortName as string,
    }).select("_id");
    if (!department) {
      return res
        .status(404)
        .json({ message: `Department ${deptShortName} not found` });
    }

    // --- 2. Build Student Query ---
    const studentFilters: mongoose.FilterQuery<any> = {
      program: program._id,
      department: department._id,
      year: yearNum,
      section: section as string,
      status: "active", // Only fetch active students
    };

    // --- 3. Execute Query ---
    const students = await Student.find(studentFilters)
      .select("name rollNumber email section") // Select fields needed for the roster
      .sort({ rollNumber: 1 }); // Sort by roll number

    // --- 4. Return Results ---
    if (!students || students.length === 0) {
      return res.status(200).json([]); // Return empty array if no students match
    }

    res.status(200).json(students);
  } catch (error: any) {
    console.error("Error fetching students by filters:", error);
    res.status(500).json({
      message: "Server error fetching students",
      error: error.message,
    });
  }
};
