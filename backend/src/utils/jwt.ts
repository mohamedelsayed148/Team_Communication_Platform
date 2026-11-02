import jwt, { SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env";

export interface TokenPayload {
  sub: string;
  roles: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

export function generateAccessToken(userId: string, roles: string[]): string {
  const payload: TokenPayload = {
    sub: userId,
    roles,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function generateRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    jti: randomUUID(),
    type: "refresh",
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    !Array.isArray(decoded.roles) ||
    !decoded.roles.every((role) => typeof role === "string")
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    sub: decoded.sub,
    roles: decoded.roles,
  };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.jti !== "string" ||
    decoded.type !== "refresh"
  ) {
    throw new Error("Invalid refresh token payload");
  }

  return {
    sub: decoded.sub,
    jti: decoded.jti,
    type: "refresh",
  };
}

export function getTokenExpirationDate(token: string): Date {
  const decoded = jwt.decode(token);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.exp !== "number"
  ) {
    throw new Error("INVALID_TOKEN_EXPIRATION");
  }

  return new Date(decoded.exp * 1000);
}
