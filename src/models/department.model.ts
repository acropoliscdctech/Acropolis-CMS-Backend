import mongoose from "mongoose";

interface IDepartment extends mongoose.Document {
  name: string;
  shortName: string;
  hod: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new mongoose.Schema<IDepartment>({
  name: { type: String, required: true ,unique: true},
  shortName: { type: String, required: true ,unique: true},
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    default: null,
  },
},{timestamps: true});

const Department = mongoose.model<IDepartment>("Department", DepartmentSchema);

export { IDepartment, Department };
