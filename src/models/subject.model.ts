import mongoose from "mongoose";

interface ISubject extends mongoose.Document {
  title: string;
  subjectCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new mongoose.Schema<ISubject>(
  {
    title: { type: String, required: true, trim: true },
    subjectCode: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

const Subject = mongoose.model<ISubject>("Subject", SubjectSchema);

export { ISubject, Subject };
