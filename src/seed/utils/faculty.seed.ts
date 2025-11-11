import { Faculty } from "../../models/faculty.model";
import { readJsonFile } from "./readJson";

export const seedFaculties = async () => {
  console.log("Seeding faculties...");
  const facultyData = await readJsonFile("faculty.json");
  for (const faculty of facultyData) {
    const existingFaculty = await Faculty.findOne({
      username: faculty.username,
    });
    if (!existingFaculty) {
      await Faculty.create({ ...faculty });
      console.log(`Created new faculty: ${faculty.username}`);
    } else {
      console.log(`Skipping existing faculty: ${faculty.username}`);
    }
  }
  console.log("Faculty processing complete!");
};
