import mongoose from "mongoose";

interface IStudent extends mongoose.Document {
  name: string;
  rollNumber: string;
  email: string;
  section: string;
  semester: number;
  year: number;
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  status: string;
  enrolledClasses: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new mongoose.Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    section: { type: String, required: true, trim: true },
    semester: { type: Number, required: true },
    year: { type: Number, required: true },
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
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    enrolledClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  },
  { timestamps: true }
);

const Student = mongoose.model<IStudent>("Student", StudentSchema);

export { IStudent, Student };
