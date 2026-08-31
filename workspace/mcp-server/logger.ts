import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Log file will be saved under the logs directory in this folder
const currentDir = typeof import.meta.url === "string" ? dirname(fileURLToPath(import.meta.url)) : process.cwd();
const LOG_FILE = join(currentDir, "logs", "mcp-server.log");

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function serializeData(data: unknown): string {
  if (data === undefined) return "";
  if (data instanceof Error) {
    return `\n${data.stack || data.message}`;
  }
  try {
    return `\n${JSON.stringify(data, null, 2)}`;
  } catch {
    return `\n[Unserializable Data: ${String(data)}]`;
  }
}

function writeLog(level: LogLevel, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const serialized = serializeData(data);
  const entry = `[${timestamp}] [${level}] ${message}${serialized}\n`;

  try {
    const dir = dirname(LOG_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(LOG_FILE, entry, "utf8");
  } catch (err) {
    process.stderr.write(`Failed to write MCP log to ${LOG_FILE}: ${String(err)}\n`);
  }
}

export const logger = {
  debug(message: string, data?: unknown) {
    writeLog("DEBUG", message, data);
  },
  info(message: string, data?: unknown) {
    writeLog("INFO", message, data);
  },
  log(message: string, data?: unknown) {
    writeLog("INFO", message, data);
  },
  warn(message: string, data?: unknown) {
    writeLog("WARN", message, data);
  },
  error(message: string, data?: unknown) {
    writeLog("ERROR", message, data);
  },
};
