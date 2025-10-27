import mongoose from "mongoose";

interface IAttendanceSummary extends mongoose.Document {
  _id: string; // custom id : "studentId_classId"
  student: mongoose.Types.ObjectId;
  semester: number;
  program: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  presentCount: number;
  absentCount: number;
  totalClasses: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSummarySchema = new mongoose.Schema<IAttendanceSummary>(
  {
    _id: { type: String, required: true },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },

    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    totalClasses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AttendanceSummary = mongoose.model<IAttendanceSummary>(
  "AttendanceSummary",
  AttendanceSummarySchema
);

export { IAttendanceSummary, AttendanceSummary };
