import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ success: true, data: { status: "ok" } });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(503).json({ success: false, message: "Database connection failed" });
  }
});

export default router;
