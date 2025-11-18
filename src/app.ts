import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";

// dotenv config
import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production" ? "production" : "development";

dotenv.config({ path: `.env.${envFile}.local` });

// express app
const app = express();

// middlewares
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// logging middleware
import logger from "./utils/logger";
const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

// routes
import healthRouter from "./routes/health.route";
import authRouter from "./routes/auth.route";
import studentRouter from "./routes/student.route";
import attendanceRouter from "./routes/attendance.route";
import timeSlotRouter from "./routes/timeSlot.route";
import programRouter from "./routes/program.route";
import subjectRouter from "./routes/subject.route";
import departmentRouter from "./routes/department.route";
import sectionRouter from "./routes/section.route";
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/students", studentRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/time-slots", timeSlotRouter);
app.use("/api/programs", programRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/sections", sectionRouter);

// Global error handling middleware - must be after all routes
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    let { statusCode, message } = error;

    // Handle specific error types
    if (error.name === "ValidationError") {
      statusCode = 400;
      message = "Validation Error";
    }

    if (error.name === "CastError") {
      statusCode = 400;
      message = "Resource not found. Invalid ID";
    }

    // Default error
    if (!statusCode) {
      statusCode = 500;
    }

    if (!message) {
      message = "Internal Server Error";
    }

    logger.error(`Error ${statusCode}: ${message}`);

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
);

// Handle 404 routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
