/**
 * Lightweight auth middleware.
 *
 * Expects an `Authorization: Bearer <token>` header.
 * Tries to verify the token as a HS256 JWT signed with SESSION_SECRET.
 * On success, `req.partnerId` is set to the `sub` claim.
 *
 * Development fallback: if JWT verification fails (e.g. during local testing
 * with a raw partner-id header), the raw token value is accepted as-is when
 * NODE_ENV !== 'production'. This lets curl / Postman tests work without a
 * real signed token.
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger.js";

declare global {
  // Extend the Express Request type
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      partnerId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ success: false, message: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env["SESSION_SECRET"];

  if (secret) {
    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      req.partnerId = String(payload["sub"] ?? payload["partnerId"] ?? "");
      if (!req.partnerId) throw new Error("no sub claim");
      return next();
    } catch (err) {
      logger.debug({ err }, "JWT verification failed");
    }
  }

  // Development fallback: treat the raw token as a partner ID
  if (process.env["NODE_ENV"] !== "production") {
    req.partnerId = token;
    return next();
  }

  res.status(401).json({ success: false, message: "Invalid token" });
}
