import pino, { type Logger } from "pino";

export function createLogger(level = process.env.LOG_LEVEL ?? "info"): Logger {
  return pino({
    level,
    redact: {
      paths: [
        "apiKey",
        "*.apiKey",
        "authorization",
        "*.authorization",
        "token",
        "*.token",
      ],
      censor: "[REDACTED]",
    },
  });
}

export const logger = createLogger();
