import { Faculty } from "../../models/faculty.model";
import { Department } from "../../models/department.model";
import { readJsonFile } from "./readJson";

export const seedFaculties = async () => {
  console.log("Seeding faculties...");
  const facultyData = await readJsonFile("faculty.json");
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
};
