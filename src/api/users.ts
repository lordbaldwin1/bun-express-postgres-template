import type { Request, Response } from "express";
import {
  createUser,
  getUserByEmail,
  getUserByID,
  updateUserCredentials,
} from "../db/queries/users"
import { BadRequestError, UnauthorizedError } from "./errors";
import type { User } from "../db/schema";
import {
  checkPasswordHash,
  getBearerToken,
  hashPassword,
  makeJWT,
  makeRefreshToken,
  validateJWT,
} from "../auth";
import { config, FIFTEEN_MINUTES, SEVEN_DAYS } from "../config";
import { getUserByRefreshToken, revokeRefreshToken, saveRefreshToken } from "../db/queries/refresh-tokens";

type UserResponse = Omit<User, "hashedPassword">;
const ONE_HOUR = 60 * 60;

export async function handlerUsersCreate(req: Request, res: Response) {
  type Parameters = {
    email: string;
    password: string;
  };

  const params: Parameters = req.body;
  if (!params.email || !params.password) {
    throw new BadRequestError("Missing required fields");
  }

  params.password = await hashPassword(params.password);
  const user = await createUser({
    email: params.email,
    hashedPassword: params.password,
  });
  if (!user) {
    throw new Error("Could not create user, does this user already exist?");
  }

  res.header("Content-Type", "application/json");
  res.status(201).send(JSON.stringify(user));
}

export async function handlerLogin(req: Request, res: Response) {
  type Parameters = {
    email: string;
    password: string;
  };

  const params: Parameters = req.body;
  if (!params.email || !params.password) {
    throw new BadRequestError("Missing required fields");
  }

  const user = await getUserByEmail(params.email);
  if (!user) {
    throw new UnauthorizedError("Incorrect email or password");
  }

  if (
    (await checkPasswordHash(params.password, user.hashedPassword)) === false
  ) {
    throw new UnauthorizedError("Incorrect email or password");
  }

  const token = makeJWT(user.id, config.jwtSecret);
  const refreshToken = makeRefreshToken();
  const dbRefreshToken = await saveRefreshToken(user.id, refreshToken);
  if (!dbRefreshToken) {
    throw new UnauthorizedError("No refresh token");
  }

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.platform === "production",
    sameSite: "strict",
    maxAge: SEVEN_DAYS,
    path: "/",
  });
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: config.platform === "production",
    sameSite: "strict",
    maxAge: FIFTEEN_MINUTES,
    path: "/",
  })

  res.header("Content-Type", "application/json");
  const response: UserResponse = {
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    email: user.email,
  };
  res.status(200).send(JSON.stringify(response));
}

export async function handlerRefreshJWT(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    throw new BadRequestError("No refresh token");
  }

  const result = await getUserByRefreshToken(refreshToken);
  if (!result?.user) {
    res.clearCookie("refreshToken", {
      path: "/",
    });
    throw new UnauthorizedError("User not found");
  }

  const user = result.user;
  const newAccessToken = makeJWT(user.id, config.jwtSecret, config.jwtDefaultDuration);
  res.set("Content-Type", "application/json");
  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: config.platform === "production",
    sameSite: "strict",
    maxAge: FIFTEEN_MINUTES,
    path: "/",
  })
  res.status(200).end();
}

export async function handlerRevokeRefreshToken(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    throw new BadRequestError("No refresh token to revoke");
  }
  await revokeRefreshToken(refreshToken);

  res.clearCookie("refreshToken", {
    path: "/"
  });

  res.clearCookie("accessToken", {
    path: "/",
  })
  res.status(204).send();
}

export async function handlerUpdateCredentials(req: Request, res: Response) {
  type Parameters = {
    password: string,
    email: string,
  }
  const token = getBearerToken(req);
  if (!token) {
    throw new BadRequestError("Bearer token missing");
  }
  const userID = validateJWT(token, config.jwtSecret);

  const params: Parameters = req.body;

  if (!params.email || !params.password) {
    throw new BadRequestError("Missing required fields");
  }
  const hashedPassword = await hashPassword(params.password);
  const updatedUser = await updateUserCredentials(userID, params.email, hashedPassword);
  if (!updatedUser) {
    throw new Error("Failed to update user");
  }

  const body: UserResponse = {
    id: updatedUser.id,
    email: updatedUser.email,
    updatedAt: updatedUser.updatedAt,
    createdAt: updatedUser.createdAt,
  }
  res.set("Content-Type", "application/json");
  res.status(200).send(JSON.stringify(body));
}

export async function handlerGetUser(req: Request, res: Response) {
  const token = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  
  if (!token && !refreshToken) {
    res.status(200).json(null);
    return;
  }

  const userID = validateJWT(token, config.jwtSecret);
  if (!userID) {
    throw new UnauthorizedError("Invalid JWT");
  }

  const user = await getUserByID(userID);
  if (!user) {
    console.log("here");
    throw new Error("User does not exist");
  }

  const body: UserResponse = {
    id: userID,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    email: user.email,
  }
  res.status(200).send(JSON.stringify(body));
}