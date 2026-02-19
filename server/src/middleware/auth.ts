import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "egotalk_dev_secret_change_in_production";

export interface AuthPayload {
  profileId: string;
}

declare global {
  namespace Express {
    interface Request {
      profileId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
      code: "UNAUTHORIZED",
    });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.profileId = payload.profileId;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      code: "UNAUTHORIZED",
    });
  }
}

export function signToken(profileId: string): string {
  return jwt.sign({ profileId } as AuthPayload, JWT_SECRET, { expiresIn: "7d" });
}

export { JWT_SECRET };
