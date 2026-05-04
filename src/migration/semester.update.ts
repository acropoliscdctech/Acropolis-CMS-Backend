import mongoose from "mongoose";
import { Student, IStudent } from "../models/student.model"; // Import IStudent interface
import { connectDb } from "../config/database";

async function upgradeStudents() {
  try {
    await connectDb();
    console.log(
      "Connected to the database. Starting student semester upgrade...",
    );

    const isDryRun = process.argv.includes("--dry-run");
    if (isDryRun) {
      console.log(
        "⚠️ Running in DRY RUN mode. No data will be permanently changed.",
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    console.log("Transaction started.");

    const batchSize = 500;
    let processedCount = 0;
    let modifiedCount = 0;

    // Explicitly type the bulk operations array with IStudent interface
    let bulkOps: mongoose.AnyBulkWriteOperation<IStudent>[] = [];

    // Process only currently active students
    const cursor = Student.find({ status: "active" })
      .session(session)
      .cursor({ batchSize });

    for await (const doc of cursor) {
      // Cast the document to IStudent explicitly if needed
      const student = doc as IStudent;
      processedCount++;

      const newSemester = student.semester + 1;
      const newYear = Math.ceil(newSemester / 2);
      let newStatus = student.status;

      // Check graduate condition
      if (newYear > 4 || newSemester > 8) {
        newStatus = "inactive";
      }

      // Add to bulk operations
      bulkOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: {
            $set: {
              semester: newSemester,
              year: newYear,
              status: newStatus,
            },
          },
        },
      });

      // Execute in batches
      if (bulkOps.length === batchSize) {
        const result = await Student.bulkWrite(bulkOps, { session });
        modifiedCount += result.modifiedCount || 0;
        console.log(`Successfully upgraded ${processedCount} students...`);
        bulkOps = []; // Reset batch
      }
    }

    // Process remainder
    if (bulkOps.length > 0) {
      const result = await Student.bulkWrite(bulkOps, { session });
      modifiedCount += result.modifiedCount || 0;
      console.log(`Successfully upgraded ${processedCount} students...`);
    }

    if (isDryRun) {
      await session.abortTransaction();
      console.log("⚠️ DRY RUN finished. Transaction aborted. No changes made.");
    } else {
      await session.commitTransaction();
      console.log("Transaction committed successfully.");
    }
    session.endSession();

    console.log(
      `Migration complete. Total active students processed: ${processedCount}. Modified: ${modifiedCount}.`,
    );
  } catch (error) {
    console.error("Fatal error during student upgrade:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

upgradeStudents();
