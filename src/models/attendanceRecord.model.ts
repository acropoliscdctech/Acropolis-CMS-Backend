import mongoose from "mongoose";

interface IAttendanceRecord extends mongoose.Document {
  student: mongoose.Types.ObjectId;
  date: Date;
  status: string;
  markedBy: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  semester: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema = new mongoose.Schema<IAttendanceRecord>(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
  },
  { timestamps: true }
);

const AttendanceRecord = mongoose.model<IAttendanceRecord>(
  "AttendanceRecord",
  AttendanceRecordSchema
);

export { IAttendanceRecord, AttendanceRecord };
