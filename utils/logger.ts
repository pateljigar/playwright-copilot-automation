import winston from "winston";
import path from "path";
import fs from "fs";

const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || "info";

const consoleFormat = winston.format.printf(({ timestamp, level, message }) => {
  const colorizer = winston.format.colorize({ all: true });
  return `${timestamp} [${colorizer.colorize(level, level.toUpperCase())}]: ${message}`;
});

const fileFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        consoleFormat,
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "test-execution.log"),
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        fileFormat,
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "errors.log"),
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        fileFormat,
      ),
    }),
  ],
});

export default logger;
