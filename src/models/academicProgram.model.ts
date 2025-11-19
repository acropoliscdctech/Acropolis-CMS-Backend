import mongoose from "mongoose";

interface IAcademicProgram extends mongoose.Document {
  name: string;
  shortName: string;
  durationInYears: number;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicProgramSchema = new mongoose.Schema<IAcademicProgram>(
  {
    name: { type: String, required: true, unique: true },
    shortName: { type: String, required: true, unique: true },
    durationInYears: { type: Number, required: true },
  },
  { timestamps: true }
);

const AcademicProgram = mongoose.model<IAcademicProgram>(
  "AcademicProgram",
  AcademicProgramSchema
);

export { IAcademicProgram, AcademicProgram };
