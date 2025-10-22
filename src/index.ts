/**
 * @module index
 * This module sets up the Socket.IO server and initializes the mediasoup components
 * necessary for media transport.
 * It also handles all socket events related to media transport.
 * @see {@link https://mediasoup.org/}
 * @see {@link https://socket.io/}
 */

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import RedisManager from "./redis_manager";

const app = express();
const port = 4000;
const server = http.createServer(app);

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

const redisManager: RedisManager = new RedisManager();
