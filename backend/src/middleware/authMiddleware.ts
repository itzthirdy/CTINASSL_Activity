import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserModel, type IUser } from "../models/User.js";

export const AUTH_COOKIE_NAME = "sp_token";

interface JwtPayload {
  sub: string;
  role: "customer" | "admin";
}

export interface AuthenticatedRequest extends Request {
  authUser?: IUser;
}

function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ?? "sole_purpose_dev_jwt_secret_change_in_prod"
  );
}

export function signAuthToken(user: {
  _id: unknown;
  role: "customer" | "admin";
}): string {
  const payload: JwtPayload = {
    sub: String(user._id),
    role: user.role,
  };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"],
  });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ message: "Authentication required. Please sign in." });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    const user = await UserModel.findById(decoded.sub);
    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ message: "Session expired or user no longer exists." });
      return;
    }

    req.authUser = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session token." });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.authUser) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }
  if (req.authUser.role !== "admin") {
    res.status(403).json({ message: "Admin access required." });
    return;
  }
  next();
}

