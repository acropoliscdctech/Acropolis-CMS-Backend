import mongoose from "mongoose";

// database connection function
export const connectDb = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;

    if (!mongoUrl) {
      throw new Error("MONGO_URL environment variable is not defined");
    }

    console.log("Attempting to connect to database...");
    console.log("MongoDB URL:", mongoUrl.replace(/\/\/.*:.*@/, "//***:***@")); // Hide credentials in logs

    // set up event listeners before connecting
    mongoose.connection.on("connected", () => {
      console.log("Database connected successfully");
    });

    mongoose.connection.on("error", (error) => {
      console.error("Database connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("Database disconnected");
    });

    // connect to the database with options
    await mongoose.connect(mongoUrl, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("MongoDB connection established");
  } catch (error) {
    console.error("Error in connecting with database:", error);
    console.error(
      "Make sure your MongoDB URL is correct and the database is accessible"
    );
    process.exit(1);
  }
};
