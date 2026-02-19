import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../db.js";
import { isValidUUID, validateRequired } from "../utils/validate.js";

const router = Router();

// GET /api/chats?profile_id=...
// 사용자가 참여한 채팅방 목록 조회
router.get("/api/chats", async (req: Request, res: Response) => {
  try {
    const profile_id = req.query.profile_id as string | undefined;

    if (!profile_id) {
      res.status(400).json({
        success: false,
        message: "profile_id is required",
        code: "INVALID_INPUT",
      });
      return;
    }

    if (!isValidUUID(profile_id)) {
      res.status(400).json({
        success: false,
        message: "profile_id must be a valid UUID",
        code: "INVALID_INPUT",
      });
      return;
    }

    // LATERAL JOIN으로 최근 메시지 및 unread 수 조회
    const result = await pool.query<{
      room_id: string;
      type: string;
      title: string | null;
      last_content: string | null;
      last_sender_name: string | null;
      last_message_at: Date | null;
      unread_count: string;
      member_count: string;
    }>(
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
         ) AS member_count
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
      [profile_id]
    );

    const data = result.rows.map((row) => ({
      room_id: row.room_id,
      type: row.type,
      title: row.title,
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
// 채팅방 생성. dm 타입의 경우 기존 방이 있으면 기존 방 반환
router.post("/api/chats", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;

    // 필수 필드 검증
    const requiredError = validateRequired(body, ["creator_id", "type", "member_ids"]);
    if (requiredError) {
      res.status(400).json({
        success: false,
        message: requiredError,
        code: "INVALID_INPUT",
      });
      return;
    }

    const creator_id = String(body.creator_id);
    const type = String(body.type);
    const title =
      body.title !== undefined && body.title !== null && body.title !== ""
        ? String(body.title).trim()
        : null;

    // creator_id UUID 검증
    if (!isValidUUID(creator_id)) {
      res.status(400).json({
        success: false,
        message: "creator_id must be a valid UUID",
        code: "INVALID_INPUT",
      });
      return;
    }

    // type 검증
    if (type !== "dm" && type !== "group") {
      res.status(400).json({
        success: false,
        message: 'type must be "dm" or "group"',
        code: "INVALID_INPUT",
      });
      return;
    }

    // member_ids 배열 검증
    if (!Array.isArray(body.member_ids)) {
      res.status(400).json({
        success: false,
        message: "member_ids must be an array",
        code: "INVALID_INPUT",
      });
      return;
    }

    const member_ids = body.member_ids as unknown[];

    if (member_ids.length < 1) {
      res.status(400).json({
        success: false,
        message: "member_ids must contain at least 1 member",
        code: "INVALID_INPUT",
      });
      return;
    }

    // 각 member_id UUID 검증
    for (const mid of member_ids) {
      if (typeof mid !== "string" || !isValidUUID(mid)) {
        res.status(400).json({
          success: false,
          message: "Each member_id must be a valid UUID",
          code: "INVALID_INPUT",
        });
        return;
      }
    }

    const memberIdList = member_ids as string[];

    // creator_id가 member_ids에 포함되면 안 됨
    if (memberIdList.includes(creator_id)) {
      res.status(400).json({
        success: false,
        message: "creator_id must not be included in member_ids",
        code: "INVALID_INPUT",
      });
      return;
    }

    // dm 타입: member_ids는 정확히 1명
    if (type === "dm" && memberIdList.length !== 1) {
      res.status(400).json({
        success: false,
        message: "dm type requires exactly 1 member in member_ids",
        code: "INVALID_INPUT",
      });
      return;
    }

    // dm 중복 방지: 같은 두 사람의 dm이 이미 존재하면 기존 방 반환
    if (type === "dm") {
      const otherId = memberIdList[0];
      const existingRoom = await pool.query<{
        id: string;
        type: string;
        title: string | null;
        created_at: Date;
      }>(
        `SELECT r.id, r.type, r.title, r.created_at
         FROM ego_chat_rooms r
         WHERE r.type = 'dm'
           AND EXISTS (
             SELECT 1 FROM ego_chat_room_members cm
             WHERE cm.room_id = r.id AND cm.user_id = $1
           )
           AND EXISTS (
             SELECT 1 FROM ego_chat_room_members cm
             WHERE cm.room_id = r.id AND cm.user_id = $2
           )
           AND (
             SELECT COUNT(*) FROM ego_chat_room_members cm WHERE cm.room_id = r.id
           ) = 2
         LIMIT 1`,
        [creator_id, otherId]
      );

      if (existingRoom.rows.length > 0) {
        const existing = existingRoom.rows[0];
        res.json({
          success: true,
          data: {
            room_id: existing.id,
            type: existing.type,
            title: existing.title,
            created_at: existing.created_at,
          },
        });
        return;
      }
    }

    // 트랜잭션으로 채팅방 + 멤버 INSERT
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 채팅방 생성
      const roomResult = await client.query<{
        id: string;
        type: string;
        title: string | null;
        created_at: Date;
      }>(
        `INSERT INTO ego_chat_rooms (type, title)
         VALUES ($1, $2)
         RETURNING id, type, title, created_at`,
        [type, title]
      );

      const room = roomResult.rows[0];
      const room_id = room.id;

      // creator 멤버 INSERT
      await client.query(
        `INSERT INTO ego_chat_room_members (room_id, user_id)
         VALUES ($1, $2)`,
        [room_id, creator_id]
      );

      // 나머지 멤버 INSERT
      for (const mid of memberIdList) {
        await client.query(
          `INSERT INTO ego_chat_room_members (room_id, user_id)
           VALUES ($1, $2)`,
          [room_id, mid]
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        data: {
          room_id: room.id,
          type: room.type,
          title: room.title,
          created_at: room.created_at,
        },
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/chats error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

export default router;
