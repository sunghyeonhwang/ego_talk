import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../db.js";

const router = Router();

// POST /api/push/subscribe
router.post("/api/push/subscribe", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const body = req.body as Record<string, unknown>;

    const endpoint = body.endpoint;
    const keys = body.keys as Record<string, unknown> | undefined;

    if (
      typeof endpoint !== "string" ||
      !endpoint ||
      !keys ||
      typeof keys.p256dh !== "string" ||
      typeof keys.auth !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "endpoint, keys.p256dh, and keys.auth are required",
        code: "INVALID_INPUT",
      });
      return;
    }

    // Upsert subscription (same endpoint may be re-registered with new keys)
    await pool.query(
      `INSERT INTO ego_push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint)
       DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [profileId, endpoint, keys.p256dh, keys.auth]
    );

    res.status(201).json({ success: true, data: { subscribed: true } });
  } catch (err) {
    console.error("POST /api/push/subscribe error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// DELETE /api/push/unsubscribe
router.delete("/api/push/unsubscribe", async (req: Request, res: Response) => {
  try {
    const profileId = req.profileId!;
    const body = req.body as Record<string, unknown>;

    const endpoint = body.endpoint;

    if (typeof endpoint !== "string" || !endpoint) {
      res.status(400).json({
        success: false,
        message: "endpoint is required",
        code: "INVALID_INPUT",
      });
      return;
    }

    await pool.query(
      `DELETE FROM ego_push_subscriptions WHERE endpoint = $1 AND user_id = $2`,
      [endpoint, profileId]
    );

    res.json({ success: true, data: { unsubscribed: true } });
  } catch (err) {
    console.error("DELETE /api/push/unsubscribe error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

export default router;
