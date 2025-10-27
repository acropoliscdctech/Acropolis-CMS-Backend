import mongoose from "mongoose";
import { Class } from "../../models/class.model";
import { Subject } from "../../models/subject.model";
import { Student, IStudent } from "../../models/student.model";
import { AcademicProgram } from "../../models/academicProgram.model";
import { Faculty } from "../../models/faculty.model";
import { Department } from "../../models/department.model";
import { readJsonFile } from "./readJson";


export const seedClasses = async (): Promise<void> => {
  console.log("Upserting classes and updating student enrollments...");
  const classesData = await readJsonFile("class.json");

  for (const classInfo of classesData) {
    // --- Step A: Look up all reference documents ---
    const subjectDoc = await Subject.findOne({
      subjectCode: classInfo.subject,
    });
    const facultyDoc = await Faculty.findOne({ username: classInfo.faculty });
    const deptDoc = await Department.findOne({
      shortName: classInfo.department,
    });
    const progDoc = await AcademicProgram.findOne({
      shortName: classInfo.program,
    });

    // --- Safety Check: Ensure all references exist before proceeding ---
    if (!subjectDoc || !facultyDoc || !deptDoc || !progDoc) {
      console.warn(
        `Skipping class "${classInfo.subject}": A required reference (subject, faculty, dept, or program) was not found.`
      );
      continue;
    }

    // --- Step B: Build the query to find students for this class ---
    const studentQuery: mongoose.FilterQuery<IStudent> = {
      program: progDoc._id,
      semester: classInfo.semester,
      status: "active",
    };

    // --- Adjust query for common (CDC) vs. regular classes ---
    if (classInfo.department !== "CDC") {
      studentQuery.department = deptDoc._id;
      studentQuery.section = classInfo.section;
    }

    // --- Step C: Find all matching students and get their IDs ---
    const studentDocs = await Student.find(studentQuery).select("_id");
    const studentIds = studentDocs.map((s) => s._id);

    // --- Step D: Define the unique properties to identify a class ---
    const uniqueClassQuery = {
      subject: subjectDoc._id,
      section: classInfo.section, // Use the exact section value from JSON
      academicYear: classInfo.academicYear,
    };

    // --- Step E: Prepare the full class document to be saved ---
    const classToSave = {
      ...uniqueClassQuery,
      faculty: facultyDoc._id,
      semester: classInfo.semester,
      department: deptDoc._id,
      program: progDoc._id,
      students: studentIds,
    };

    // --- Step F: Upsert the Class document ---
    await Class.updateOne(
      uniqueClassQuery,
      { $set: classToSave },
      { upsert: true }
    );

    // --- Step G: Reliably get the Class ID after the upsert operation ---
    const finalClass = await Class.findOne(uniqueClassQuery).select("_id");

    if (!finalClass?._id) {
      console.error(
        `FATAL ERROR: Could not find class "${classInfo.subject}" in section "${classInfo.section}" after a successful upsert. Skipping student enrollment.`
      );
      continue;
    }
    const classId = finalClass._id; // This is now a correctly typed ObjectId

    // --- Step H: Update students' 'enrolledClasses' array ---
    if (studentIds.length > 0) {
      const studentUpdateResult = await Student.updateMany(
        { _id: { $in: studentIds } },
        { $addToSet: { enrolledClasses: classId } }
      );
      console.log(
        `Processed Class "${classInfo.subject}" (${
          classInfo.section || "Common"
        }): Enrolled ${studentIds.length} students. Updated ${
          studentUpdateResult.modifiedCount
        } documents.`
      );
    } else {
      console.log(
        `Processed Class "${classInfo.subject}" (${
          classInfo.section || "Common"
        }): No active students found matching criteria.`
      );
    }
  } // End of loop

  console.log("Class seeding and student enrollment update complete!");
};
