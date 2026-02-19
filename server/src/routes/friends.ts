import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../db.js";
import { isValidUUID } from "../utils/validate.js";

const router = Router();

// GET /api/friends?q=...
router.get("/api/friends", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const q = req.query.q as string | undefined;

    const params: unknown[] = [profileId];
    let searchCondition = "";

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      searchCondition = `AND (p.display_name ILIKE $${params.length} OR p.status_message ILIKE $${params.length})`;
    }

    const result = await pool.query(
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
router.patch("/api/friends/:friendId/favorite", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const friendIdRaw = req.params["friendId"];
    const friendId = Array.isArray(friendIdRaw) ? friendIdRaw[0] : friendIdRaw;
    const body = req.body as Record<string, unknown>;

    if (!friendId || !isValidUUID(friendId)) {
      res.status(400).json({ success: false, message: "friendId must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    if (body.favorite === undefined || body.favorite === null || typeof body.favorite !== "boolean") {
      res.status(400).json({ success: false, message: "favorite must be a boolean", code: "INVALID_INPUT" });
      return;
    }

    const result = await pool.query(
      `UPDATE ego_friendships
       SET favorite = $1
       WHERE user_id = $2 AND friend_id = $3
       RETURNING id AS friendship_id, favorite`,
      [body.favorite, profileId, friendId]
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
router.post("/api/friends/add", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const body = req.body as Record<string, unknown>;
    const friend_email = typeof body.friend_email === "string" ? body.friend_email.trim().toLowerCase() : "";

    if (!friend_email) {
      res.status(400).json({ success: false, message: "friend_email is required", code: "INVALID_INPUT" });
      return;
    }

    // 이메일로 상대방 프로필 조회
    const friendProfileResult = await pool.query(
      `SELECT id, display_name, status_message, avatar_url
       FROM ego_profiles WHERE email = $1`,
      [friend_email]
    );

    if (friendProfileResult.rows.length === 0) {
      res.status(404).json({ success: false, message: "Friend profile not found", code: "NOT_FOUND" });
      return;
    }

    const friendProfile = friendProfileResult.rows[0];

    if (friendProfile.id === profileId) {
      res.status(400).json({ success: false, message: "Cannot add yourself as a friend", code: "INVALID_INPUT" });
      return;
    }

    // 이미 친구인지 확인
    const existingResult = await pool.query(
      `SELECT id FROM ego_friendships WHERE user_id = $1 AND friend_id = $2`,
      [profileId, friendProfile.id]
    );

    if (existingResult.rows.length > 0) {
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

    // 양방향 친구 추가
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertResult = await client.query<{ id: string }>(
        `INSERT INTO ego_friendships (user_id, friend_id) VALUES ($1, $2) RETURNING id`,
        [profileId, friendProfile.id]
      );

      await client.query(
        `INSERT INTO ego_friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [friendProfile.id, profileId]
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
