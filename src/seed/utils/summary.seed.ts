import mongoose from "mongoose";
import { Student } from "../../models/student.model"; // Adjust path
import { AttendanceSummary } from "../../models/attendanceSummary.model"; //

export const seedAttendanceSummaries = async (): Promise<void> => {
  console.log("Seeding initial Semester-based Attendance Summaries...");

  // Find all active students and select fields needed for the summary key
  const activeStudents = await Student.find({ status: "active" }).select(
    "_id program department semester" // Select program, department, and semester
  );

  if (!activeStudents || activeStudents.length === 0) {
    console.log("No active students found to seed summaries for.");
    return;
  }

  let summariesCreated = 0;
  let summariesSkipped = 0;

  // Iterate through each active student
  for (const student of activeStudents) {
    // Validate required fields
    if (!student.program || !student.department || !student.semester) {
      console.warn(
        `Skipping summary for student ${student._id}: Missing program, department, or semester info.`
      );
      continue;
    }

    // Construct the unique _id for the semester summary document
    const summaryId = `${student._id}_${student.program}_${student.semester}`;

    // Prepare the data for the summary document (counts default to 0)
    const summaryData = {
      _id: summaryId,
      student: student._id,
      program: student.program, // Store program ID
      department: student.department, // Store student's primary department ID
      semester: student.semester, // Store semester number
      presentCount: 0,
      absentCount: 0,
      // lateCount: 0,    // Only include if tracking these
      // excusedCount: 0, // Only include if tracking these
      totalClasses: 0,
    };

    // Use updateOne with upsert: true to create only if it doesn't exist
    try {
      const result = await AttendanceSummary.updateOne(
        { _id: summaryId }, // Find condition based on unique ID
        { $setOnInsert: summaryData }, // Set these fields only on insert
        { upsert: true } // Create if doesn't exist
      );

      if (result.upsertedCount > 0) {
        summariesCreated++;
      } else {
        summariesSkipped++; // Already existed
      }
    } catch (error: any) {
      console.error(
        `Error upserting summary for student ${student._id}, semester ${student.semester}: ${error.message}`
      );
    }
  } // End loop through students

  console.log(
    `Semester Attendance Summary seeding complete. Created: ${summariesCreated}, Skipped (already existed): ${summariesSkipped}`
  );
};
