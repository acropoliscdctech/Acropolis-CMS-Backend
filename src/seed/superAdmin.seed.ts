import mongoose from "mongoose";
import { connectDb } from "../config/database";
import { SuperAdmin } from "../models/superAdmin.model";

export const seedSuperAdmin = async () => {
  try {
    const name = "Himanshu";
    const username = ("Super.Admin").toLowerCase();
    const password = "123456789";

    console.log(`Checking if Super Admin (${username}) exists...`);

    const existingAdmin = await SuperAdmin.findOne({ username });

    if (existingAdmin) {
      console.log(
        `Super Admin already exists with ID: ${existingAdmin._id} (username: ${existingAdmin.username}). Skipping creation.`
      );
      return existingAdmin;
    }

    const newAdmin = await SuperAdmin.create({
      name,
      username,
      password,
    });

    console.log("-----------------------------------------");
    console.log(" Super Admin created successfully!");
    console.log(` Name:     ${newAdmin.name}`);
    console.log(` Username: ${newAdmin.username}`);
    console.log(" Password: (set as configured)");
    console.log("-----------------------------------------");

    return newAdmin;
  } catch (error) {
    console.error("Error seeding Super Admin:", error);
    throw error;
  }
};

const run = async () => {
  try {
    await connectDb();
    await seedSuperAdmin();
    console.log("Super Admin seeder finished successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Seeder execution failed:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}
