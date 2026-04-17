import pino from "pino";

/**
 * Configure the global logger instance.
 * Defaults to JSON output for production reliability.
 * Enables pretty-printing in development for better readability.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
