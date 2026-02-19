import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per window

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(ip);
    }
  }
}, WINDOW_MS);

export function rateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      message: "Too many requests",
      code: "RATE_LIMITED",
    });
    return;
  }

  entry.count += 1;
  next();
}
