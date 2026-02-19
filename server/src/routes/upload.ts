import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import pool from "../db.js";

const router = Router();

// Multer: memory storage, 5MB limit, JPEG/PNG/WebP/GIF only
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
});

// POST /api/upload/avatar
router.post(
  "/api/upload/avatar",
  upload.single("avatar"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded. Provide an 'avatar' field.",
          code: "INVALID_INPUT",
        });
        return;
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceRoleKey) {
        res.status(500).json({
          success: false,
          message: "Storage service is not configured",
          code: "INTERNAL_ERROR",
        });
        return;
      }

      const profileId = req.profileId!;
      const file = req.file;

      // Determine file extension from MIME type
      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = extMap[file.mimetype] ?? "jpg";

      // Storage path: {profileId}/{timestamp}.{ext}
      const timestamp = Date.now();
      const storagePath = `${profileId}/${timestamp}.${ext}`;

      // Supabase client using service role key (bypasses RLS)
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

      // Upload to Supabase Storage bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        res.status(500).json({
          success: false,
          message: "Failed to upload image",
          code: "INTERNAL_ERROR",
        });
        return;
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(storagePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Update ego_profiles.avatar_url
      const result = await pool.query(
        `UPDATE ego_profiles
         SET avatar_url = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, display_name, status_message, avatar_url, updated_at`,
        [avatarUrl, profileId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Profile not found",
          code: "NOT_FOUND",
        });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      // Handle multer errors (file too large, wrong type)
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({
            success: false,
            message: "File size must not exceed 5MB",
            code: "INVALID_INPUT",
          });
          return;
        }
        res.status(400).json({
          success: false,
          message: err.message,
          code: "INVALID_INPUT",
        });
        return;
      }
      if (err instanceof Error && err.message === "INVALID_FILE_TYPE") {
        res.status(400).json({
          success: false,
          message: "Only JPEG, PNG, WebP, and GIF images are allowed",
          code: "INVALID_INPUT",
        });
        return;
      }
      console.error("POST /api/upload/avatar error:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

export default router;
