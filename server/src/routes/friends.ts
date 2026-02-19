import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../db.js";
import { isValidUUID, validateRequired } from "../utils/validate.js";

const router = Router();

// GET /api/friends?profile_id=...&q=...
// profile_id에 속한 친구 목록 반환 (즐겨찾기 먼저, 이름순)
router.get("/api/friends", async (req: Request, res: Response) => {
  try {
    const profile_id = req.query.profile_id as string | undefined;
    const q = req.query.q as string | undefined;

    if (!profile_id) {
      res.status(400).json({ success: false, message: "profile_id is required", code: "INVALID_INPUT" });
      return;
    }

    if (!isValidUUID(profile_id)) {
      res.status(400).json({ success: false, message: "profile_id must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    const params: unknown[] = [profile_id];
    let searchCondition = "";

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      searchCondition = `AND (p.display_name ILIKE $${params.length} OR p.status_message ILIKE $${params.length})`;
    }

    const result = await pool.query<{
      friendship_id: string;
      friend_id: string;
      display_name: string;
      status_message: string | null;
      avatar_url: string | null;
      favorite: boolean;
    }>(
      `SELECT
         f.id AS friendship_id,
         p.id AS friend_id,
         p.display_name,
         p.status_message,
         p.avatar_url,
         f.favorite
       FROM ego_friendships f
       JOIN ego_profiles p ON p.id = f.friend_id
       WHERE f.user_id = $1
         ${searchCondition}
       ORDER BY f.favorite DESC, p.display_name ASC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("GET /api/friends error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// PATCH /api/friends/:friendId/favorite
// 특정 친구 관계의 즐겨찾기 상태 업데이트
router.patch("/api/friends/:friendId/favorite", async (req: Request, res: Response) => {
  try {
    const friendIdRaw = req.params["friendId"];
    const friendId = Array.isArray(friendIdRaw) ? friendIdRaw[0] : friendIdRaw;
    const body = req.body as Record<string, unknown>;

    // params 검증
    if (!friendId || !isValidUUID(friendId)) {
      res.status(400).json({ success: false, message: "friendId must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    // body 필수 필드 검증
    const requiredError = validateRequired(body, ["profile_id"]);
    if (requiredError) {
      res.status(400).json({ success: false, message: requiredError, code: "INVALID_INPUT" });
      return;
    }

    const profile_id = String(body.profile_id);

    if (!isValidUUID(profile_id)) {
      res.status(400).json({ success: false, message: "profile_id must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    if (body.favorite === undefined || body.favorite === null) {
      res.status(400).json({ success: false, message: "favorite is required", code: "INVALID_INPUT" });
      return;
    }

    if (typeof body.favorite !== "boolean") {
      res.status(400).json({ success: false, message: "favorite must be a boolean", code: "INVALID_INPUT" });
      return;
    }

    const favorite = body.favorite;

    const result = await pool.query<{
      id: string;
      favorite: boolean;
    }>(
      `UPDATE ego_friendships
       SET favorite = $1
       WHERE user_id = $2 AND friend_id = $3
       RETURNING id AS friendship_id, favorite`,
      [favorite, profile_id, friendId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Friendship not found", code: "NOT_FOUND" });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("PATCH /api/friends/:friendId/favorite error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// POST /api/friends/add
// friend_device_id로 상대방을 찾아 양방향 친구 추가
router.post("/api/friends/add", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;

    // 필수 필드 검증
    const requiredError = validateRequired(body, ["profile_id", "friend_device_id"]);
    if (requiredError) {
      res.status(400).json({ success: false, message: requiredError, code: "INVALID_INPUT" });
      return;
    }

    const profile_id = String(body.profile_id);
    const friend_device_id = String(body.friend_device_id).trim();

    // profile_id UUID 검증
    if (!isValidUUID(profile_id)) {
      res.status(400).json({ success: false, message: "profile_id must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    // friend_device_id 공백 검증
    if (!friend_device_id) {
      res.status(400).json({ success: false, message: "friend_device_id must not be empty", code: "INVALID_INPUT" });
      return;
    }

    // device_id로 상대방 프로필 조회
    const friendProfileResult = await pool.query<{
      id: string;
      device_id: string;
      display_name: string;
      status_message: string | null;
      avatar_url: string | null;
    }>(
      `SELECT id, device_id, display_name, status_message, avatar_url
       FROM ego_profiles
       WHERE device_id = $1`,
      [friend_device_id]
    );

    if (friendProfileResult.rows.length === 0) {
      res.status(404).json({ success: false, message: "Friend profile not found", code: "NOT_FOUND" });
      return;
    }

    const friendProfile = friendProfileResult.rows[0];

    // 자기 자신 추가 방지
    if (friendProfile.id === profile_id) {
      res.status(400).json({ success: false, message: "Cannot add yourself as a friend", code: "INVALID_INPUT" });
      return;
    }

    // 이미 친구인지 확인 (user_id → friend_id 방향)
    const existingResult = await pool.query<{
      id: string;
    }>(
      `SELECT id FROM ego_friendships
       WHERE user_id = $1 AND friend_id = $2`,
      [profile_id, friendProfile.id]
    );

    if (existingResult.rows.length > 0) {
      // 이미 친구인 경우 기존 관계 반환
      res.json({
        success: true,
        data: {
          friendship_id: existingResult.rows[0].id,
          friend: {
            id: friendProfile.id,
            display_name: friendProfile.display_name,
            status_message: friendProfile.status_message,
            avatar_url: friendProfile.avatar_url,
          },
        },
      });
      return;
    }

    // 트랜잭션으로 양방향 INSERT
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // user → friend
      const insertResult = await client.query<{ id: string }>(
        `INSERT INTO ego_friendships (user_id, friend_id)
         VALUES ($1, $2)
         RETURNING id`,
        [profile_id, friendProfile.id]
      );

      // friend → user (역방향)
      await client.query(
        `INSERT INTO ego_friendships (user_id, friend_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [friendProfile.id, profile_id]
      );

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        data: {
          friendship_id: insertResult.rows[0].id,
          friend: {
            id: friendProfile.id,
            display_name: friendProfile.display_name,
            status_message: friendProfile.status_message,
            avatar_url: friendProfile.avatar_url,
          },
        },
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/friends/add error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

export default router;
