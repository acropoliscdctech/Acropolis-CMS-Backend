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
app.use(cors());
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
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);

export default app;
