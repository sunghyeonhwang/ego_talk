import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";
import { signToken } from "../middleware/auth.js";

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";

    if (!email || !password || !display_name) {
      res.status(400).json({
        success: false,
        message: "email, password, and display_name are required",
        code: "INVALID_INPUT",
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
        code: "INVALID_INPUT",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
        code: "INVALID_INPUT",
      });
      return;
    }

    // Check if email already exists
    const existing = await pool.query(
      "SELECT id FROM ego_profiles WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "Email already registered",
        code: "EMAIL_EXISTS",
      });
      return;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO ego_profiles (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, status_message, avatar_url, created_at`,
      [email, password_hash, display_name]
    );

    const profile = result.rows[0];
    const token = signToken(profile.id);

    res.status(201).json({
      success: true,
      data: {
        token,
        profile: {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          status_message: profile.status_message || "",
          avatar_url: profile.avatar_url || "",
        },
      },
    });
  } catch (err) {
    console.error("POST /api/auth/register error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// POST /api/auth/login
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "email and password are required",
        code: "INVALID_INPUT",
      });
      return;
    }

    const result = await pool.query(
      `SELECT id, email, password_hash, display_name, status_message, avatar_url
       FROM ego_profiles WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    const profile = result.rows[0];

    if (!profile.password_hash) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    const token = signToken(profile.id);

    res.json({
      success: true,
      data: {
        token,
        profile: {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          status_message: profile.status_message || "",
          avatar_url: profile.avatar_url || "",
        },
      },
    });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

export default router;
