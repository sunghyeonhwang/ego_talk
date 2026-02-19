import { Router } from "express";
import type { Request, Response } from "express";
import type { Server } from "socket.io";
import pool from "../db.js";
import { isValidUUID, validateRequired } from "../utils/validate.js";

let _io: Server | null = null;

export function setSocketIO(io: Server) {
  _io = io;
}

const router = Router();

// GET /api/chats
router.get("/api/chats", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;

    const result = await pool.query(
      `SELECT
         r.id AS room_id,
         r.type,
         r.title,
         lm.content AS last_content,
         lm.display_name AS last_sender_name,
         lm.created_at AS last_message_at,
         (
           SELECT COUNT(*)
           FROM ego_messages msg
           WHERE msg.room_id = r.id
             AND msg.created_at > m.last_read_message_at
         ) AS unread_count,
         (
           SELECT COUNT(*)
           FROM ego_chat_room_members cm
           WHERE cm.room_id = r.id
         ) AS member_count,
         (
           SELECT string_agg(p2.display_name, ', ')
           FROM ego_chat_room_members cm2
           JOIN ego_profiles p2 ON p2.id = cm2.user_id
           WHERE cm2.room_id = r.id
             AND cm2.user_id != $1
         ) AS member_names
       FROM ego_chat_room_members m
       JOIN ego_chat_rooms r ON r.id = m.room_id
       LEFT JOIN LATERAL (
         SELECT
           msg.content,
           msg.created_at,
           p.display_name
         FROM ego_messages msg
         JOIN ego_profiles p ON p.id = msg.sender_id
         WHERE msg.room_id = r.id
         ORDER BY msg.created_at DESC
         LIMIT 1
       ) lm ON true
       WHERE m.user_id = $1
       ORDER BY COALESCE(lm.created_at, r.created_at) DESC`,
      [profileId]
    );

    const data = result.rows.map((row) => ({
      room_id: row.room_id,
      type: row.type,
      title: row.title || row.member_names || '채팅방',
      last_message:
        row.last_content !== null
          ? {
              content: row.last_content,
              sender_name: row.last_sender_name,
              created_at: row.last_message_at,
            }
          : null,
      unread_count: parseInt(row.unread_count, 10),
      member_count: parseInt(row.member_count, 10),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/chats error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// POST /api/chats
router.post("/api/chats", async (req: Request, res: Response) => {
  try {
    const creatorId = req.profileId!;
    const body = req.body as Record<string, unknown>;

    const requiredError = validateRequired(body, ["type", "member_ids"]);
    if (requiredError) {
      res.status(400).json({ success: false, message: requiredError, code: "INVALID_INPUT" });
      return;
    }

    const type = String(body.type);
    const title =
      body.title !== undefined && body.title !== null && body.title !== ""
        ? String(body.title).trim()
        : null;

    if (type !== "dm" && type !== "group") {
      res.status(400).json({ success: false, message: 'type must be "dm" or "group"', code: "INVALID_INPUT" });
      return;
    }

    if (!Array.isArray(body.member_ids)) {
      res.status(400).json({ success: false, message: "member_ids must be an array", code: "INVALID_INPUT" });
      return;
    }

    const member_ids = body.member_ids as unknown[];

    if (member_ids.length < 1) {
      res.status(400).json({ success: false, message: "member_ids must contain at least 1 member", code: "INVALID_INPUT" });
      return;
    }

    for (const mid of member_ids) {
      if (typeof mid !== "string" || !isValidUUID(mid)) {
        res.status(400).json({ success: false, message: "Each member_id must be a valid UUID", code: "INVALID_INPUT" });
        return;
      }
    }

    const memberIdList = member_ids as string[];

    if (memberIdList.includes(creatorId)) {
      res.status(400).json({ success: false, message: "creator_id must not be included in member_ids", code: "INVALID_INPUT" });
      return;
    }

    if (type === "dm" && memberIdList.length !== 1) {
      res.status(400).json({ success: false, message: "dm type requires exactly 1 member in member_ids", code: "INVALID_INPUT" });
      return;
    }

    // dm 중복 방지
    if (type === "dm") {
      const otherId = memberIdList[0];
      const existingRoom = await pool.query(
        `SELECT r.id, r.type, r.title, r.created_at
         FROM ego_chat_rooms r
         WHERE r.type = 'dm'
           AND EXISTS (SELECT 1 FROM ego_chat_room_members cm WHERE cm.room_id = r.id AND cm.user_id = $1)
           AND EXISTS (SELECT 1 FROM ego_chat_room_members cm WHERE cm.room_id = r.id AND cm.user_id = $2)
           AND (SELECT COUNT(*) FROM ego_chat_room_members cm WHERE cm.room_id = r.id) = 2
         LIMIT 1`,
        [creatorId, otherId]
      );

      if (existingRoom.rows.length > 0) {
        const existing = existingRoom.rows[0];
        res.json({
          success: true,
          data: { room_id: existing.id, type: existing.type, title: existing.title, created_at: existing.created_at },
        });
        return;
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const roomResult = await client.query(
        `INSERT INTO ego_chat_rooms (type, title) VALUES ($1, $2) RETURNING id, type, title, created_at`,
        [type, title]
      );

      const room = roomResult.rows[0];

      await client.query(
        `INSERT INTO ego_chat_room_members (room_id, user_id) VALUES ($1, $2)`,
        [room.id, creatorId]
      );

      for (const mid of memberIdList) {
        await client.query(
          `INSERT INTO ego_chat_room_members (room_id, user_id) VALUES ($1, $2)`,
          [room.id, mid]
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        data: { room_id: room.id, type: room.type, title: room.title, created_at: room.created_at },
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/chats error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// GET /api/chats/:roomId/info
router.get("/api/chats/:roomId/info", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const roomId = req.params.roomId as string;

    if (!isValidUUID(roomId)) {
      res.status(400).json({ success: false, message: "roomId must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    const result = await pool.query(
      `SELECT
         r.id AS room_id,
         r.type,
         r.title,
         (
           SELECT string_agg(p2.display_name, ', ')
           FROM ego_chat_room_members cm2
           JOIN ego_profiles p2 ON p2.id = cm2.user_id
           WHERE cm2.room_id = r.id
             AND cm2.user_id != $2
         ) AS member_names,
         (
           SELECT COUNT(*)
           FROM ego_chat_room_members cm
           WHERE cm.room_id = r.id
         ) AS member_count
       FROM ego_chat_rooms r
       WHERE r.id = $1
         AND EXISTS (
           SELECT 1 FROM ego_chat_room_members cm
           WHERE cm.room_id = r.id AND cm.user_id = $2
         )`,
      [roomId, profileId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Room not found or you are not a member", code: "ROOM_NOT_FOUND" });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        room_id: row.room_id,
        type: row.type,
        title: row.title || row.member_names || '채팅방',
        member_names: row.member_names,
        member_count: parseInt(row.member_count, 10),
      },
    });
  } catch (err) {
    console.error("GET /api/chats/:roomId/info error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// Membership helper
async function checkMembership(roomId: string, profileId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM ego_chat_room_members WHERE room_id = $1 AND user_id = $2`,
    [roomId, profileId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// GET /api/chats/:roomId/messages
router.get("/api/chats/:roomId/messages", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const roomId = req.params.roomId as string;
    const cursor = req.query.cursor as string | undefined;
    let limit = parseInt(req.query.limit as string, 10);

    if (!isValidUUID(roomId)) {
      res.status(400).json({ success: false, message: "roomId must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    if (cursor !== undefined && !isValidUUID(cursor)) {
      res.status(400).json({ success: false, message: "cursor must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    if (isNaN(limit) || limit < 1) limit = 30;
    if (limit > 50) limit = 50;

    const isMember = await checkMembership(roomId, profileId);
    if (!isMember) {
      res.status(403).json({ success: false, message: "You are not a member of this chat room", code: "NOT_A_MEMBER" });
      return;
    }

    let query: string;
    let params: (string | number)[];

    if (cursor) {
      query = `SELECT m.id, m.room_id, m.sender_id, m.content, m.message_type, m.created_at,
                      p.display_name AS sender_name
               FROM ego_messages m
               JOIN ego_profiles p ON p.id = m.sender_id
               WHERE m.room_id = $1
                 AND m.created_at < (SELECT created_at FROM ego_messages WHERE id = $2)
               ORDER BY m.created_at DESC
               LIMIT $3`;
      params = [roomId, cursor, limit + 1];
    } else {
      query = `SELECT m.id, m.room_id, m.sender_id, m.content, m.message_type, m.created_at,
                      p.display_name AS sender_name
               FROM ego_messages m
               JOIN ego_profiles p ON p.id = m.sender_id
               WHERE m.room_id = $1
               ORDER BY m.created_at DESC
               LIMIT $2`;
      params = [roomId, limit + 1];
    }

    const result = await pool.query(query, params);
    const has_more = result.rows.length > limit;
    const messages = result.rows.slice(0, limit).reverse();
    const next_cursor = has_more && messages.length > 0 ? messages[0].id : null;

    res.json({ success: true, data: { messages, next_cursor, has_more } });
  } catch (err) {
    console.error("GET /api/chats/:roomId/messages error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// POST /api/chats/:roomId/messages
router.post("/api/chats/:roomId/messages", async (req: Request, res: Response) => {
  try {
    const senderId = req.profileId!;
    const roomId = req.params.roomId as string;
    const body = req.body as Record<string, unknown>;

    if (!isValidUUID(roomId)) {
      res.status(400).json({ success: false, message: "roomId must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    const requiredError = validateRequired(body, ["content"]);
    if (requiredError) {
      res.status(400).json({ success: false, message: requiredError, code: "INVALID_INPUT" });
      return;
    }

    const content = String(body.content).trim();

    if (content.length === 0) {
      res.status(400).json({ success: false, message: "content must not be empty", code: "INVALID_INPUT" });
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({ success: false, message: "content must be 1000 characters or less", code: "MESSAGE_TOO_LONG" });
      return;
    }

    const isMember = await checkMembership(roomId, senderId);
    if (!isMember) {
      res.status(403).json({ success: false, message: "You are not a member of this chat room", code: "NOT_A_MEMBER" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO ego_messages (room_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, room_id, sender_id, content, message_type, created_at`,
      [roomId, senderId, content]
    );

    const msg = result.rows[0];

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

    if (_io) {
      _io.to(roomId).emit("message:new", { roomId, message });
      _io.emit("chat:updated", { roomId });
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error("POST /api/chats/:roomId/messages error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// POST /api/chats/:roomId/read
router.post("/api/chats/:roomId/read", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const roomId = req.params.roomId as string;
    const body = req.body as Record<string, unknown>;

    if (!isValidUUID(roomId)) {
      res.status(400).json({ success: false, message: "roomId must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    const requiredError = validateRequired(body, ["last_read_message_id"]);
    if (requiredError) {
      res.status(400).json({ success: false, message: requiredError, code: "INVALID_INPUT" });
      return;
    }

    const last_read_message_id = String(body.last_read_message_id);

    if (!isValidUUID(last_read_message_id)) {
      res.status(400).json({ success: false, message: "last_read_message_id must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    const isMember = await checkMembership(roomId, profileId);
    if (!isMember) {
      res.status(403).json({ success: false, message: "You are not a member of this chat room", code: "NOT_A_MEMBER" });
      return;
    }

    const result = await pool.query(
      `UPDATE ego_chat_room_members
       SET last_read_message_id = $1,
           last_read_message_at = (SELECT created_at FROM ego_messages WHERE id = $1)
       WHERE room_id = $2 AND user_id = $3
       RETURNING last_read_message_at`,
      [last_read_message_id, roomId, profileId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: "Room membership not found", code: "NOT_A_MEMBER" });
      return;
    }

    res.json({
      success: true,
      data: { room_id: roomId, profile_id: profileId, last_read_message_at: result.rows[0].last_read_message_at },
    });
  } catch (err) {
    console.error("POST /api/chats/:roomId/read error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// PATCH /api/chats/:roomId/mute
router.patch("/api/chats/:roomId/mute", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const roomId = req.params.roomId as string;
    const body = req.body as Record<string, unknown>;

    if (!isValidUUID(roomId)) {
      res.status(400).json({ success: false, message: "roomId must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    if (body.mute === undefined || body.mute === null || typeof body.mute !== "boolean") {
      res.status(400).json({ success: false, message: "mute must be a boolean", code: "INVALID_INPUT" });
      return;
    }

    const isMember = await checkMembership(roomId, profileId);
    if (!isMember) {
      res.status(403).json({ success: false, message: "You are not a member of this chat room", code: "NOT_A_MEMBER" });
      return;
    }

    const result = await pool.query(
      `UPDATE ego_chat_room_members SET mute = $1 WHERE room_id = $2 AND user_id = $3 RETURNING room_id, mute`,
      [body.mute, roomId, profileId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Room membership not found", code: "NOT_A_MEMBER" });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("PATCH /api/chats/:roomId/mute error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

export default router;
