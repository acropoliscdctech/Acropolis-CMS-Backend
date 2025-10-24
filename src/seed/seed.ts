import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { connectDb } from "../config/database";

import { AcademicProgram } from "../models/academicProgram.model";
import { Department } from "../models/department.model";
import { Faculty } from "../models/faculty.model";

const readJsonFile = async (filePath: string) => {
  const fileData = await fs.readFile(
    path.join(__dirname, "../../..", "data", filePath),
    "utf-8"
  );
  return JSON.parse(fileData);
};

const importData = async () => {
  try {
    console.log("Starting data import...");
    const programsData = await readJsonFile("program.json");
    const departmentsData = await readJsonFile("department.json");
    const facultyData = await readJsonFile("faculty.json");

    // Upsert Programs
    for (const program of programsData) {
      await AcademicProgram.updateOne(
        { shortName: program.shortName },
        { $set: program },
        { upsert: true }
      );
    }
    console.log("Programs upserted!");

    for (const dept of departmentsData) {
      await Department.updateOne(
        { shortName: dept.shortName },
        { $set: dept },
        { upsert: true }
      );
    }
    console.log("Departments upserted!");

    for (const faculty of facultyData) {
      const existingFaculty = await Faculty.findOne({
        username: faculty.username,
      });
      if (!existingFaculty) {
        const dept = await Department.findOne({
          shortName: faculty.department,
        });
        if (dept) {
          await Faculty.create({ ...faculty, department: dept._id });
          console.log(`Created new faculty: ${faculty.username}`);
        } else {
          console.warn(
            `Skipping faculty: Dept "${faculty.department}" not found.`
          );
        }
      } else {
        console.log(`Skipping existing faculty: ${faculty.username}`);
      }
    }
    console.log("Faculty processing complete!");

    console.log("Seeding script finished!");
    process.exit(0);
  } catch (err) {
    console.error(`Error importing data: ${err}`);
    process.exit(1);
  }
};

const run = async () => {
  try {
    await connectDb();
    if (process.argv[2] === "--import") {
      await importData();
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
