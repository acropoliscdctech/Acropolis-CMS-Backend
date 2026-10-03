import mongoose from "mongoose";
import { Student, IStudent } from "../models/student.model";
import { connectDb } from "../config/database";

export async function upgradeStudents(isDryRun = false) {
  const session = await mongoose.startSession();
  let processedCount = 0;
  let modifiedCount = 0;

  try {
    session.startTransaction();
    const batchSize = 500;
    let bulkOps: mongoose.AnyBulkWriteOperation<IStudent>[] = [];
    const cursor = Student.find({ status: "active" })
      .session(session)
      .cursor({ batchSize });

    for await (const doc of cursor) {
      const student = doc as IStudent;
      processedCount++;
      const newSemester = student.semester + 1;
      const newYear = Math.ceil(newSemester / 2);
      const newStatus = newYear > 4 || newSemester > 8 ? "inactive" : student.status;

      bulkOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { semester: newSemester, year: newYear, status: newStatus } },
        },
      });

      if (bulkOps.length === batchSize) {
        const result = await Student.bulkWrite(bulkOps, { session });
        modifiedCount += result.modifiedCount || 0;
        bulkOps = [];
      }
    }

    if (bulkOps.length > 0) {
      const result = await Student.bulkWrite(bulkOps, { session });
      modifiedCount += result.modifiedCount || 0;
    }

    if (isDryRun) await session.abortTransaction();
    else await session.commitTransaction();

    return { processedCount, modifiedCount, dryRun: isDryRun };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

if (require.main === module) {
  (async () => {
    try {
      await connectDb();
      console.log("Connected to the database. Starting student semester upgrade...");
      const isDryRun = process.argv.includes("--dry-run");
      if (isDryRun) console.log("Running in DRY RUN mode. No data will be permanently changed.");
      const result = await upgradeStudents(isDryRun);
      console.log(
        `Migration complete. Total active students processed: ${result.processedCount}. Modified: ${result.modifiedCount}.`,
      );
    } catch (error) {
      console.error("Fatal error during student upgrade:", error);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
      console.log("Database connection closed.");
    }
  })();
}
