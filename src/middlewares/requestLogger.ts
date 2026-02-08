import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../utils/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomBytes(6).toString("hex");
  (req as any).requestId = requestId;

  const start = Date.now();

  logger.info("➡️  Request start", {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.on("finish", () => {
    logger.info("✅ Request end", {
      requestId,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}
