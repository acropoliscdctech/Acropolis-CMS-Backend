import mongoose from "mongoose";
import { Student } from "../../models/student.model";
import { AttendanceSummary } from "../../models/attendanceSummary.model";

export const seedAttendanceSummaries = async (): Promise<void> => {
  console.log("Seeding initial Attendance Summaries...");

  const activeStudents = await Student.find({ status: "active" }).select(
    "_id enrolledClasses"
  );

  if (!activeStudents || activeStudents.length === 0) {
    console.log("No active students found to seed summaries for.");
    return;
  }

  let summariesCreated = 0;
  let summariesSkipped = 0;

  for (const student of activeStudents) {
    if (!student.enrolledClasses || student.enrolledClasses.length === 0) {
      continue;
    }

    for (const classId of student.enrolledClasses) {
      const summaryId = `${student._id}_${classId}`;

      const summaryData = {
        _id: summaryId,
        student: student._id,
        class: classId,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        totalClasses: 0,
      };

      try {
        const result = await AttendanceSummary.updateOne(
          { _id: summaryId },
          { $setOnInsert: summaryData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          summariesCreated++;
        } else {
          summariesSkipped++;
        }
      } catch (error: any) {
        console.error(
          `Error upserting summary for student ${student._id}, class ${classId}: ${error.message}`
        );
      }
    }
  }

  console.log(
    `Attendance Summary seeding complete. Created: ${summariesCreated}, Skipped (already existed): ${summariesSkipped}`
  );
};
