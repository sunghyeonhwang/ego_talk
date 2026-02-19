import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import healthRouter from "./routes/health.js";
import profilesRouter from "./routes/profiles.js";
import friendsRouter from "./routes/friends.js";
import chatsRouter from "./routes/chats.js";
import { setupSocketHandlers } from "./socket.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());
app.use(healthRouter);
app.use(profilesRouter);
app.use(friendsRouter);
app.use(chatsRouter);

setupSocketHandlers(io);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
