import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/profiles/me
// 현재 로그인한 사용자의 프로필 조회
router.get("/api/profiles/me", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;

    const result = await pool.query(
      `SELECT id, email, display_name, status_message, avatar_url, created_at, updated_at
       FROM ego_profiles WHERE id = $1`,
      [profileId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Profile not found", code: "NOT_FOUND" });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("GET /api/profiles/me error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// PATCH /api/profiles/me
// 현재 로그인한 사용자의 프로필 수정
router.patch("/api/profiles/me", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const body = req.body as Record<string, unknown>;

    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (body.display_name !== undefined) {
      const display_name = String(body.display_name).trim();
      if (!display_name) {
        res.status(400).json({ success: false, message: "display_name must not be empty", code: "INVALID_INPUT" });
        return;
      }
      params.push(display_name);
      setClauses.push(`display_name = $${params.length}`);
    }

    if (body.status_message !== undefined) {
      params.push(String(body.status_message));
      setClauses.push(`status_message = $${params.length}`);
    }

    if (body.avatar_url !== undefined) {
      params.push(String(body.avatar_url));
      setClauses.push(`avatar_url = $${params.length}`);
    }

    if (setClauses.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one field (display_name, status_message, avatar_url) must be provided",
        code: "INVALID_INPUT",
      });
      return;
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(profileId);
    const profileIdParam = `$${params.length}`;

    const result = await pool.query(
      `UPDATE ego_profiles
       SET ${setClauses.join(", ")}
       WHERE id = ${profileIdParam}
       RETURNING id, email, display_name, status_message, avatar_url, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Profile not found", code: "NOT_FOUND" });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("PATCH /api/profiles/me error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

export default router;
