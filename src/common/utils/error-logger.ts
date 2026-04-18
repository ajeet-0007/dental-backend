import * as fs from "fs";
import * as path from "path";

const LOGS_DIR = path.join(process.cwd(), "logs");

export const errorLogger = {
  log(error: Error | string, context?: string) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error
      ? `${error.message}\nStack: ${error.stack}`
      : String(error);

    const logEntry = `[${timestamp}]${context ? ` [${context}]` : ""}\n${errorMessage}\n${"=".repeat(50)}\n`;

    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const logFile = path.join(LOGS_DIR, `error-${new Date().toISOString().split("T")[0]}.log`);
    fs.appendFileSync(logFile, logEntry);

    console.error(`Error logged to: ${logFile}`);
  },

  getLogs(date?: string): string[] {
    const logDate = date || new Date().toISOString().split("T")[0];
    const logFile = path.join(LOGS_DIR, `error-${logDate}.log`);

    if (!fs.existsSync(logFile)) {
      return [];
    }

    return fs.readFileSync(logFile, "utf-8").split(`${"=".repeat(50)}\n`).filter(Boolean);
  }
};