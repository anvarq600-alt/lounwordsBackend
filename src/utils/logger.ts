type LogLevel = "info" | "warn" | "error" | "debug";

function ts() {
  return new Date().toISOString();
}

function base(level: LogLevel, msg: string, meta?: Record<string, any>) {
  const payload = meta ? ` | ${JSON.stringify(meta)}` : "";
  // konsol uchun chiroyli
  // eslint-disable-next-line no-console
  console.log(`[${ts()}] [${level.toUpperCase()}] ${msg}${payload}`);
}

export const logger = {
  info: (msg: string, meta?: Record<string, any>) => base("info", msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => base("warn", msg, meta),
  error: (msg: string, meta?: Record<string, any>) => base("error", msg, meta),
  debug: (msg: string, meta?: Record<string, any>) => {
    if (process.env.LOG_LEVEL === "debug") base("debug", msg, meta);
  },
};
