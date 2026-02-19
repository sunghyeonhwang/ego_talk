import { Server, Socket } from "socket.io";
import pool from "./db.js";
import { isValidUUID } from "./utils/validate.js";

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("Socket connected:", socket.id);

    // room:join - 채팅방 입장 (Socket.IO room join)
    socket.on(
      "room:join",
      async (data: { roomId: string; profileId: string }) => {
        try {
          const { roomId, profileId } = data;

          if (!roomId || !profileId) {
            socket.emit("error", {
              code: "INVALID_INPUT",
              message: "roomId and profileId are required",
            });
            return;
          }

          if (!isValidUUID(roomId) || !isValidUUID(profileId)) {
            socket.emit("error", {
              code: "INVALID_INPUT",
              message: "roomId and profileId must be valid UUIDs",
            });
            return;
          }

          // 멤버십 확인
          const membership = await pool.query(
            `SELECT 1 FROM ego_chat_room_members WHERE room_id = $1 AND user_id = $2`,
            [roomId, profileId]
          );

          if (membership.rowCount === 0) {
            socket.emit("error", {
              code: "NOT_A_MEMBER",
              message: "You are not a member of this chat room",
            });
            return;
          }

          socket.join(roomId);
          socket.emit("room:joined", { roomId });
          console.log(
            `Socket ${socket.id} joined room ${roomId} as ${profileId}`
          );
        } catch (err) {
          console.error("room:join error:", err);
          socket.emit("error", {
            code: "INTERNAL_ERROR",
            message: "Failed to join room",
          });
        }
      }
    );

    // message:send - 메시지 전송
    socket.on(
      "message:send",
      async (data: {
        roomId: string;
        senderId: string;
        content: string;
      }) => {
        try {
          const { roomId, senderId } = data;
          const content = typeof data.content === "string" ? data.content.trim() : "";

          if (!roomId || !senderId) {
            socket.emit("error", {
              code: "INVALID_INPUT",
              message: "roomId and senderId are required",
            });
            return;
          }

          if (!isValidUUID(roomId) || !isValidUUID(senderId)) {
            socket.emit("error", {
              code: "INVALID_INPUT",
              message: "roomId and senderId must be valid UUIDs",
            });
            return;
          }

          // content 검증
          if (content.length === 0) {
            socket.emit("error", {
              code: "INVALID_INPUT",
              message: "content must not be empty",
            });
            return;
          }

          if (content.length > 1000) {
            socket.emit("error", {
              code: "MESSAGE_TOO_LONG",
              message: "content must be 1000 characters or less",
            });
            return;
          }

          // 멤버십 확인
          const membership = await pool.query(
            `SELECT 1 FROM ego_chat_room_members WHERE room_id = $1 AND user_id = $2`,
            [roomId, senderId]
          );

          if (membership.rowCount === 0) {
            socket.emit("error", {
              code: "NOT_A_MEMBER",
              message: "You are not a member of this chat room",
            });
            return;
          }

          // DB INSERT
          const result = await pool.query(
            `INSERT INTO ego_messages (room_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, room_id, sender_id, content, message_type, created_at`,
            [roomId, senderId, content]
          );

          const msg = result.rows[0];

          // sender_name 조회
          const profileResult = await pool.query(
            `SELECT display_name FROM ego_profiles WHERE id = $1`,
            [senderId]
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

          // 해당 방의 모든 소켓에 메시지 전송
          io.to(roomId).emit("message:new", { roomId, message });

          // 채팅 목록 갱신 알림 (전역)
          io.emit("chat:updated", { roomId });
        } catch (err) {
          console.error("message:send error:", err);
          socket.emit("error", {
            code: "INTERNAL_ERROR",
            message: "Failed to send message",
          });
        }
      }
    );

    // message:read - 읽음 처리
    socket.on(
      "message:read",
      async (data: {
        roomId: string;
        profileId: string;
        lastReadMessageId: string;
      }) => {
        try {
          const { roomId, profileId, lastReadMessageId } = data;

          if (!roomId || !profileId || !lastReadMessageId) {
            socket.emit("error", {
              code: "INVALID_INPUT",
              message:
                "roomId, profileId, and lastReadMessageId are required",
            });
            return;
          }

          if (
            !isValidUUID(roomId) ||
            !isValidUUID(profileId) ||
            !isValidUUID(lastReadMessageId)
          ) {
            socket.emit("error", {
              code: "INVALID_INPUT",
              message:
                "roomId, profileId, and lastReadMessageId must be valid UUIDs",
            });
            return;
          }

          // 멤버십 확인
          const membership = await pool.query(
            `SELECT 1 FROM ego_chat_room_members WHERE room_id = $1 AND user_id = $2`,
            [roomId, profileId]
          );

          if (membership.rowCount === 0) {
            socket.emit("error", {
              code: "NOT_A_MEMBER",
              message: "You are not a member of this chat room",
            });
            return;
          }

          // DB UPDATE
          await pool.query(
            `UPDATE ego_chat_room_members
             SET last_read_message_id = $1,
                 last_read_message_at = (SELECT created_at FROM ego_messages WHERE id = $1)
             WHERE room_id = $2 AND user_id = $3`,
            [lastReadMessageId, roomId, profileId]
          );

          // 읽음 업데이트를 방의 모든 소켓에 전송
          io.to(roomId).emit("message:read:update", {
            roomId,
            profileId,
            lastReadMessageId,
          });
        } catch (err) {
          console.error("message:read error:", err);
          socket.emit("error", {
            code: "INTERNAL_ERROR",
            message: "Failed to update read status",
          });
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}
