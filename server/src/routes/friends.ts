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

export default router;
