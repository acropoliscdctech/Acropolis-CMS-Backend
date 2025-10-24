import mongoose from "mongoose";

interface ISubject extends mongoose.Document {
  title: string;
  subjectCode: string;
  semester: number;
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new mongoose.Schema<ISubject>(
  {
    title: { type: String, required: true, trim: true },
    subjectCode: { type: String, required: true, unique: true, trim: true },
    semester: { type: Number, required: true },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicProgram",
      required: true,
    },
  },
  { timestamps: true }
);

const Subject = mongoose.model<ISubject>("Subject", SubjectSchema);

export { ISubject, Subject };
