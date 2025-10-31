import bcrypt from "bcryptjs"
import jwt, { type JwtPayload } from "jsonwebtoken"
import { UnauthorizedError } from "./api/errors";
import { type Request } from "express";
import { randomBytes } from "node:crypto";

const ONE_HOUR = 60*60;
const TOKEN_ISSUER = "fortune-teller";
type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function checkPasswordHash(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export function makeJWT(userID: string, secret: string, expiresIn?: number) {
  const expirationTime = expiresIn ? expiresIn : ONE_HOUR;
  const timeInSeconds = Math.floor(Date.now() / 1000);
  const payload: payload = {
    iss: TOKEN_ISSUER,
    sub: userID,
    iat: timeInSeconds,
    exp: timeInSeconds + expirationTime,
  }
  return jwt.sign(payload, secret);
}

export function validateJWT(tokenString: string, secret: string) {
  let decoded: payload;
  try {
    decoded = jwt.verify(tokenString, secret) as JwtPayload;
  } catch (e) {
    throw new UnauthorizedError("Invalid token");
  }

  if (decoded.iss !== TOKEN_ISSUER) {
    throw new UnauthorizedError("Invalid issuer");
  }

  if (!decoded.sub) {
    throw new UnauthorizedError("No user ID in token");
  }

  return decoded.sub;
}

export function makeRefreshToken() {
  return randomBytes(32).toString('hex');
}

export function getBearerToken(req: Request) {
  const header = req.get("Authorization");
  if (!header) {
    throw new UnauthorizedError("Malformed header");
  }

  const splitAuthHeader = header.split(" ");
  return splitAuthHeader[1];
}

export function getAPIKey(req: Request) {
  const header = req.get("Authorization");
  if (!header) {
    throw new UnauthorizedError("HA, YOU THOUGHT!")
  }
  const splitAuthHeader = header.split(" ");
  return splitAuthHeader[1];
}