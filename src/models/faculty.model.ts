import mongoose from "mongoose";
import bcrypt from "bcrypt";

interface IFaculty extends mongoose.Document {
  name: string;
  email: string;
  username: string;
  password: string;
  designation: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const FacultySchema = new mongoose.Schema<IFaculty>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    designation: { type: String, required: true },
  },
  { timestamps: true }
);

FacultySchema.pre<IFaculty>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

FacultySchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Faculty = mongoose.model<IFaculty>("Faculty", FacultySchema);

export { IFaculty, Faculty };
