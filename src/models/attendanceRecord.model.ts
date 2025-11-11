import mongoose from "mongoose";

interface IAttendanceRecord extends mongoose.Document {
  student: mongoose.Types.ObjectId;
  date: Date;
  status: string;
  markedBy: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  section: string;
  subject: mongoose.Types.ObjectId;
  timeSlot: mongoose.Types.ObjectId;
  semester: number;
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
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    timeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    section: {
      type: String,
      required: true,
    },
    semester: {
      type: Number,
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

AttendanceRecordSchema.index(
  { student: 1, date: 1, subject: 1, timeSlot: 1 },
  { unique: true }
);

const AttendanceRecord = mongoose.model<IAttendanceRecord>(
  "AttendanceRecord",
  AttendanceRecordSchema
);

export { IAttendanceRecord, AttendanceRecord };
