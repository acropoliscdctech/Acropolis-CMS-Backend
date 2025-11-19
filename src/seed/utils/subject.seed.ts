import { Subject } from "../../models/subject.model";
import { readJsonFile } from "./readJson";

export const seedSubjects = async () => {
  console.log("Seeding subjects...");
  const subjectsData = await readJsonFile("subject.json");
  for (const subject of subjectsData) {
    const subjectToSave = {
      title: subject.title,
      subjectCode: subject.subjectCode,
    };

    await Subject.updateOne(
      { subjectCode: subject.subjectCode },
      { $set: subjectToSave },
      { upsert: true }
    );
  }
  console.log("Subjects upserted!");
};
