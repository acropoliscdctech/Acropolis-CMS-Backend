import mongoose from "mongoose";

interface IClass extends mongoose.Document {
  subject: string;
  faculty: mongoose.Types.ObjectId;
  section: string;
  academicYear: string;
  semester: string;
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new mongoose.Schema<IClass>(
  {
    subject: { type: String, required: true, trim: true },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    section: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
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
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  },
  { timestamps: true }
);

const Class = mongoose.model<IClass>("Class", ClassSchema);

export { IClass, Class };
