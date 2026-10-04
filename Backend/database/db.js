import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);

    process.exit(1);
  }
};

export default connectDB;
//ye file is used to connect to the MongoDB database using Mongoose. It exports a function `connectDB` that attempts to establish a connection to the database using the connection string specified in the environment variable `MONGODB_URI`. If the connection is successful, it logs a success message; if it fails, it logs an error message and exits the process.