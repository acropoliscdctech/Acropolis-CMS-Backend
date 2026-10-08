import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createHmac } from "node:crypto";

const pepperPassword = (password: string): string => {
  const pepperBase64 = process.env.PEPPER_SECRET;
  if (!pepperBase64) {
    throw new Error("PEPPER_SECRET must be set to use Super Admin passwords");
  }

  // Convert Base64 key to a raw binary buffer for cryptographic precision
  const pepperBuffer = Buffer.from(pepperBase64, "base64");
  return createHmac("sha256", pepperBuffer).update(password).digest("hex");
};

interface ISuperAdmin extends mongoose.Document {
  name: string;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const SuperAdminSchema = new mongoose.Schema<ISuperAdmin>(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

SuperAdminSchema.pre("save", async function (this: ISuperAdmin, next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(pepperPassword(this.password), salt);
    next();
  } catch (error: any) {
    next(error); // Securely pass down errors to Mongoose error handling
  }
});

SuperAdminSchema.methods.comparePassword = async function (
  this: ISuperAdmin,
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(pepperPassword(candidatePassword), this.password);
};

const SuperAdmin = mongoose.model<ISuperAdmin>("SuperAdmin", SuperAdminSchema);

export { ISuperAdmin, SuperAdmin };
