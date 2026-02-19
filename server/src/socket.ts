import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import pool from "./db.js";
import { isValidUUID } from "./utils/validate.js";
import { JWT_SECRET, type AuthPayload } from "./middleware/auth.js";
import { sendPushToRoom } from "./utils/pushNotification.js";

export function setupSocketHandlers(io: Server) {
  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      socket.data.profileId = payload.profileId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const profileId: string = socket.data.profileId;
    console.log(`Socket connected: ${socket.id} (profile: ${profileId})`);

    // Cache display name
    pool.query("SELECT display_name FROM ego_profiles WHERE id = $1", [profileId])
      .then((res) => {
        socket.data.displayName = res.rows[0]?.display_name ?? null;
      })
      .catch(() => {});

    // room:join
    socket.on("room:join", async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        if (!roomId || !isValidUUID(roomId)) {
          socket.emit("error", { code: "INVALID_INPUT", message: "roomId must be a valid UUID" });
          return;
        }

        const membership = await pool.query(
          `SELECT 1 FROM ego_chat_room_members WHERE room_id = $1 AND user_id = $2`,
          [roomId, profileId]
        );

        if (membership.rowCount === 0) {
          socket.emit("error", { code: "NOT_A_MEMBER", message: "You are not a member of this chat room" });
          return;
        }

        socket.join(roomId);
        socket.emit("room:joined", { roomId });
        console.log(`Socket ${socket.id} joined room ${roomId} as ${profileId}`);
      } catch (err) {
        console.error("room:join error:", err);
        socket.emit("error", { code: "INTERNAL_ERROR", message: "Failed to join room" });
      }
    });

    // message:send
    socket.on("message:send", async (data: { roomId: string; content: string }) => {
      try {
        const { roomId } = data;
        const content = typeof data.content === "string" ? data.content.trim() : "";

        if (!roomId || !isValidUUID(roomId)) {
          socket.emit("error", { code: "INVALID_INPUT", message: "roomId must be a valid UUID" });
          return;
        }

        if (content.length === 0) {
          socket.emit("error", { code: "INVALID_INPUT", message: "content must not be empty" });
          return;
        }

        if (content.length > 1000) {
          socket.emit("error", { code: "MESSAGE_TOO_LONG", message: "content must be 1000 characters or less" });
          return;
        }

        const membership = await pool.query(
          `SELECT 1 FROM ego_chat_room_members WHERE room_id = $1 AND user_id = $2`,
          [roomId, profileId]
        );

        if (membership.rowCount === 0) {
          socket.emit("error", { code: "NOT_A_MEMBER", message: "You are not a member of this chat room" });
          return;
        }

        const result = await pool.query(
          `INSERT INTO ego_messages (room_id, sender_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, room_id, sender_id, content, message_type, created_at`,
          [roomId, profileId, content]
        );

        const msg = result.rows[0];

        const profileResult = await pool.query(
          `SELECT display_name FROM ego_profiles WHERE id = $1`,
          [profileId]
        );
        const sender_name = profileResult.rows[0]?.display_name ?? null;

        const message = {
          id: msg.id,
          room_id: msg.room_id,
          sender_id: msg.sender_id,
          sender_name,
          content: msg.content,
          message_type: msg.message_type,
          created_at: msg.created_at,
        };

        io.to(roomId).emit("message:new", { roomId, message });
        io.emit("chat:updated", { roomId });

        // Fire-and-forget push notification
        sendPushToRoom(roomId, profileId, message);
      } catch (err) {
        console.error("message:send error:", err);
        socket.emit("error", { code: "INTERNAL_ERROR", message: "Failed to send message" });
      }
    });

    // typing:start
    socket.on("typing:start", (data: { roomId: string }) => {
      const { roomId } = data;
      if (!roomId || !isValidUUID(roomId)) return;
      socket.to(roomId).emit("typing:start", {
        roomId,
        profileId,
        displayName: socket.data.displayName ?? null,
      });
    });

    // typing:stop
    socket.on("typing:stop", (data: { roomId: string }) => {
      const { roomId } = data;
      if (!roomId || !isValidUUID(roomId)) return;
      socket.to(roomId).emit("typing:stop", { roomId, profileId });
    });

    // message:read
    socket.on("message:read", async (data: { roomId: string; lastReadMessageId: string }) => {
      try {
        const { roomId, lastReadMessageId } = data;

        if (!roomId || !lastReadMessageId) {
          socket.emit("error", { code: "INVALID_INPUT", message: "roomId and lastReadMessageId are required" });
          return;
        }

        if (!isValidUUID(roomId) || !isValidUUID(lastReadMessageId)) {
          socket.emit("error", { code: "INVALID_INPUT", message: "roomId and lastReadMessageId must be valid UUIDs" });
          return;
        }

        const membership = await pool.query(
          `SELECT 1 FROM ego_chat_room_members WHERE room_id = $1 AND user_id = $2`,
          [roomId, profileId]
        );

        if (membership.rowCount === 0) {
          socket.emit("error", { code: "NOT_A_MEMBER", message: "You are not a member of this chat room" });
          return;
        }

        await pool.query(
          `UPDATE ego_chat_room_members
           SET last_read_message_id = $1,
               last_read_message_at = (SELECT created_at FROM ego_messages WHERE id = $1)
           WHERE room_id = $2 AND user_id = $3`,
          [lastReadMessageId, roomId, profileId]
        );

        io.to(roomId).emit("message:read:update", {
          roomId,
          profileId,
          lastReadMessageId,
        });
      } catch (err) {
        console.error("message:read error:", err);
        socket.emit("error", { code: "INTERNAL_ERROR", message: "Failed to update read status" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}
