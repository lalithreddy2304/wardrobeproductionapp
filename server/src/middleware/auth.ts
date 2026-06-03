import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const DEV_JWT_SECRET = "my-wardrobe-dev-secret-change-in-production";

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV !== "production") return DEV_JWT_SECRET;
  throw new Error("JWT_SECRET is required in production");
}

export type AuthPayload = { userId: string; email: string };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
