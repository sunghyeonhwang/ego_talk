import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../db.js";
import { isValidUUID, validateRequired } from "../utils/validate.js";

const router = Router();

// POST /api/profiles/bootstrap
// device_id로 기존 프로필 조회 후 반환, 없으면 display_name으로 생성
router.post("/api/profiles/bootstrap", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;

    // device_id 필수 검증
    const deviceIdError = validateRequired(body, ["device_id"]);
    if (deviceIdError) {
      res.status(400).json({ success: false, message: deviceIdError, code: "INVALID_INPUT" });
      return;
    }

    const device_id = String(body.device_id).trim();
    if (!device_id) {
      res.status(400).json({ success: false, message: "device_id must not be empty", code: "INVALID_INPUT" });
      return;
    }

    // 기존 프로필 조회
    const selectResult = await pool.query<{
      id: string;
      device_id: string;
      display_name: string;
      status_message: string | null;
      avatar_url: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, device_id, display_name, status_message, avatar_url, created_at, updated_at
       FROM ego_profiles
       WHERE device_id = $1`,
      [device_id]
    );

    if (selectResult.rows.length > 0) {
      res.json({ success: true, data: selectResult.rows[0] });
      return;
    }

    // 신규 생성: display_name 필수
    const displayNameError = validateRequired(body, ["display_name"]);
    if (displayNameError) {
      res.status(400).json({ success: false, message: displayNameError, code: "INVALID_INPUT" });
      return;
    }

    const display_name = String(body.display_name).trim();
    if (!display_name) {
      res.status(400).json({ success: false, message: "display_name must not be empty", code: "INVALID_INPUT" });
      return;
    }

    const insertResult = await pool.query<{
      id: string;
      device_id: string;
      display_name: string;
      status_message: string | null;
      avatar_url: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO ego_profiles (device_id, display_name)
       VALUES ($1, $2)
       ON CONFLICT (device_id) DO NOTHING
       RETURNING id, device_id, display_name, status_message, avatar_url, created_at, updated_at`,
      [device_id, display_name]
    );

    // ON CONFLICT DO NOTHING으로 인해 삽입되지 않은 경우 재조회
    if (insertResult.rows.length === 0) {
      const retryResult = await pool.query<{
        id: string;
        device_id: string;
        display_name: string;
        status_message: string | null;
        avatar_url: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, device_id, display_name, status_message, avatar_url, created_at, updated_at
         FROM ego_profiles
         WHERE device_id = $1`,
        [device_id]
      );
      res.json({ success: true, data: retryResult.rows[0] });
      return;
    }

    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (err) {
    console.error("POST /api/profiles/bootstrap error:", err);
    res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// PATCH /api/profiles/me
// profile_id로 프로필 수정 (display_name, status_message, avatar_url 선택적)
router.patch("/api/profiles/me", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;

    // profile_id 필수 검증
    const profileIdError = validateRequired(body, ["profile_id"]);
    if (profileIdError) {
      res.status(400).json({ success: false, message: profileIdError, code: "INVALID_INPUT" });
      return;
    }

    const profile_id = String(body.profile_id);

    if (!isValidUUID(profile_id)) {
      res.status(400).json({ success: false, message: "profile_id must be a valid UUID", code: "INVALID_INPUT" });
      return;
    }

    // 수정할 필드 수집
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

    // 최소 하나의 수정 필드가 있어야 함
    if (setClauses.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one field (display_name, status_message, avatar_url) must be provided",
        code: "INVALID_INPUT",
      });
      return;
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(profile_id);
    const profileIdParam = `$${params.length}`;

    const result = await pool.query<{
      id: string;
      device_id: string;
      display_name: string;
      status_message: string | null;
      avatar_url: string | null;
      updated_at: Date;
    }>(
      `UPDATE ego_profiles
       SET ${setClauses.join(", ")}
       WHERE id = ${profileIdParam}
       RETURNING id, device_id, display_name, status_message, avatar_url, updated_at`,
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
