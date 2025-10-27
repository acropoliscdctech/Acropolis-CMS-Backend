import { Department } from "../../models/department.model";
import { readJsonFile } from "./readJson";

export const seedDepartments = async () => {
  console.log("Seeding departments...");
  const departmentsData = await readJsonFile("department.json");
  for (const dept of departmentsData) {
    await Department.updateOne(
      { shortName: dept.shortName },
      { $set: dept },
      { upsert: true }
    );
  }
  console.log("Departments upserted!");
};
