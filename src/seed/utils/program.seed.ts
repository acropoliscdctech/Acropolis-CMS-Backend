import { AcademicProgram } from "../../models/academicProgram.model";
import { readJsonFile } from "./readJson";

export const seedPrograms = async () => {
  console.log("Seeding programs...");
  const programsData = await readJsonFile("program.json");
  for (const program of programsData) {
    await AcademicProgram.updateOne(
      { shortName: program.shortName },
      { $set: program },
      { upsert: true }
    );
  }
  console.log("Programs upserted!");
};
