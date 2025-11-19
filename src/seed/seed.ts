import mongoose from "mongoose";
import { seedPrograms } from "./utils/program.seed";
import { seedDepartments } from "./utils/department.seed";
import { seedFaculties } from "./utils/faculty.seed";
import { seedSubjects } from "./utils/subject.seed";
import { seedStudents } from "./utils/student.seed";
import { seedAttendanceSummaries } from "./utils/summary.seed";
import { seedTimeSlots } from "./utils/timeSlot.seed";
import { connectDb } from "../config/database";

import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";
import { Faculty } from "../models/faculty.model";
import { Subject } from "../models/subject.model";
import { Student } from "../models/student.model";
import { TimeSlot } from "../models/timeSlot.model";

const importData = async () => {
  try {
    console.log("Starting data import...");
    await seedPrograms();
    await seedDepartments();
    await seedFaculties();
    await seedSubjects();
    await seedStudents();
    await seedAttendanceSummaries();
    await seedTimeSlots();

    console.log("Seeding script finished!");
    process.exit(0);
  } catch (err) {
    console.error(`Error importing data: ${err}`);
    process.exit(1);
  }
};

const deleteData = async () => {
  try {
    console.log("Starting data deletion...");
    await AcademicProgram.deleteMany({});
    await Department.deleteMany({});
    await Faculty.deleteMany({});
    await Subject.deleteMany({});
    await Student.deleteMany({});
    await TimeSlot.deleteMany({});
    console.log("Data deletion script finished!");
    process.exit(0);
  } catch (err) {
    console.error(`Error deleting data: ${err}`);
    process.exit(1);
  }
};

const run = async () => {
  try {
    await connectDb();
    if (process.argv[2] === "--import") {
      await importData();
    } else if (process.argv[2] === "--delete") {
      await deleteData();
    } else {
      console.log("Please add --import or --delete flag to run the seeder.");
      process.exit(1);
    }
  } catch (error) {
    console.log();
    process.exit(1);
  }
};

run();
