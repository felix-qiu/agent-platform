import pino, { type DestinationStream, type Logger } from "pino";

export function createLogger(
  level = process.env.LOG_LEVEL ?? "info",
  destination?: DestinationStream,
): Logger {
  return pino(
    {
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
    },
    destination,
  );
}

export const logger = createLogger();
