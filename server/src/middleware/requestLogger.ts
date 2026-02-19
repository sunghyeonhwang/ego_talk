import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

// Extend Express Request to carry requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = randomUUID();
  req.requestId = requestId;

  const startAt = Date.now();

  res.on("finish", () => {
    const elapsedMs = Date.now() - startAt;
    console.log(
      `[${requestId}] ${req.method} ${req.url} ${res.statusCode} ${elapsedMs}ms`
    );
  });

  next();
}
