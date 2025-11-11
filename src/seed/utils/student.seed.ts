import { Student } from "../../models/student.model";
import { Department } from "../../models/department.model";
import { AcademicProgram } from "../../models/academicProgram.model";
import { readJsonFile } from "./readJson";

export const seedStudents = async () => {
  console.log("Seeding students...");
  const studentsData = await readJsonFile("student.json"); // Load student data

  for (const student of studentsData) {
    const existingStudent = await Student.findOne({
      enrollment: student.enrollment,
    });

    if (!existingStudent) {
      // Find the department and program IDs
      const dept = await Department.findOne({ shortName: student.department });
      const prog = await AcademicProgram.findOne({
        shortName: student.program,
      });

      if (!dept) {
        console.warn(
          `Skipping student "${student.enrollment}": Department "${student.department}" not found.`
        );
        continue; // Skip this student
      }
      if (!prog) {
        console.warn(
          `Skipping student "${student.enrollment}": Program "${student.program}" not found.`
        );
        continue; // Skip this student
      }

      // Create the new student
      try {
        await Student.create({
          name: student.name,
          enrollment: student.enrollment,
          scholarNo: student.scholarNo,
          email: student.email,
          semester: student.semester,
          year: student.year,
          section: student.section,
          status: student.status || "active", // Default to active
          department: dept._id, // Use the found ObjectId
          program: prog._id, // Use the found ObjectId
        });
        console.log(`Created new student: ${student.enrollment}`);
      } catch (error: any) {
        console.error(
          `Error creating student ${student.enrollment}: ${error.message}`
        );
      }
    } else {
      console.log(`Skipping existing student: ${student.enrollment}`);
      // Optional: Add logic here to update existing students if needed
    }
  }
  console.log("Student seeding complete!");
};
