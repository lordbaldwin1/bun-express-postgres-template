import express, { json } from "express";
import { config } from "./config";
import {
  middlewareErrorHandler,
  middlewareLogResponses,
} from "./api/middleware";
import {
  handlerGetUser,
  handlerLogin,
  handlerRefreshJWT,
  handlerRevokeRefreshToken,
  handlerUsersCreate,
} from "./api/users"
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(json());
app.use(
  cors({
    origin: config.clientURL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(middlewareLogResponses);

app.post("/api/users/create", (req, res, next) => {
  Promise.resolve(handlerUsersCreate(req, res).catch(next));
});
app.post("/api/users/login", (req, res, next) => {
  Promise.resolve(handlerLogin(req, res).catch(next));
});
app.get("/api/users", (req, res, next) => {
  Promise.resolve(handlerGetUser(req, res).catch(next));
});
app.post("/api/users/refresh", (req, res, next) => {
  Promise.resolve(handlerRefreshJWT(req, res).catch(next));
});
app.post("/api/users/logout", (req, res, next) => {
  Promise.resolve(handlerRevokeRefreshToken(req, res).catch(next));
});

app.use(middlewareErrorHandler);

const server = app.listen(config.port, async () => {
  console.log(`Server listening on ${config.baseURL}${config.port}`);
});