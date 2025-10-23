import mongoose from "mongoose";

interface IFaculty extends mongoose.Document {
  name: string;
  email: string;
  username: string;
  password: string;
  department: mongoose.Types.ObjectId;
  designation: string;
  createdAt: Date;
  updatedAt: Date;
}

const FacultySchema = new mongoose.Schema<IFaculty>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    designation: { type: String, required: true },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
  },
  { timestamps: true }
);

const Faculty = mongoose.model<IFaculty>("Faculty", FacultySchema);

export { IFaculty, Faculty };
