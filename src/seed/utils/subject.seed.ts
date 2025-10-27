import { Subject } from "../../models/subject.model";
import { AcademicProgram } from "../../models/academicProgram.model";
import { Department } from "../../models/department.model";
import { readJsonFile } from "./readJson";

export const seedSubjects = async () => {
  console.log("Seeding subjects...");
  const subjectsData = await readJsonFile("subject.json");
  for (const subject of subjectsData) {
    const dept = await Department.findOne({ shortName: subject.department });
    const prog = await AcademicProgram.findOne({
      shortName: subject.program,
    });

    if (!dept) {
      console.warn(
        `Skipping subject "${subject.title}": Department "${subject.department}" not found.`
      );
      continue;
    }
    if (!prog) {
      console.warn(
        `Skipping subject "${subject.title}": Program "${subject.program}" not found.`
      );
      continue;
    }

    const subjectToSave = {
      title: subject.title,
      subjectCode: subject.subjectCode,
      semester: subject.semester,
      department: dept._id,
      program: prog._id,
    };

    await Subject.updateOne(
      { subjectCode: subject.subjectCode },
      { $set: subjectToSave },
      { upsert: true }
    );
  }
  console.log("Subjects upserted!");
};
