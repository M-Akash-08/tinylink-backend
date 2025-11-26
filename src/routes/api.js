import express from "express";
import { query } from "../db.js";

const router = express.Router();

// Code regex [A-Za-z0-9]{6,8}
const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function generateRandomCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function generateUniqueCode() {
  // Try a few times to avoid collision
  for (let i = 0; i < 5; i++) {
    const code = generateRandomCode(6);
    const existing = await query("SELECT 1 FROM links WHERE code = $1", [code]);
    if (existing.rowCount === 0) return code;
  }
  throw new Error("Could not generate unique code");
}

// POST /api/links - Create link
router.post("/links", async (req, res, next) => {
  try {
    const { url, code: customCode } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "Invalid URL. Use http or https." });
    }

    let code = customCode?.trim() || "";

    if (code) {
      if (!CODE_REGEX.test(code)) {
        return res.status(400).json({
          error: "Custom code must be 6–8 characters [A-Za-z0-9]"
        });
      }

      const existing = await query("SELECT 1 FROM links WHERE code = $1", [code]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: "Code already exists" });
      }
    } else {
      code = await generateUniqueCode();
    }

    const insertRes = await query(
      `INSERT INTO links (code, target_url) 
       VALUES ($1, $2)
       RETURNING code, target_url AS url, total_clicks AS totalClicks,
                 last_clicked_at AS lastClickedAt, created_at AS createdAt`,
      [code, url]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/links - List all links
router.get("/links", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT code,
              target_url AS url,
              total_clicks AS totalClicks,
              last_clicked_at AS lastClickedAt,
              created_at AS createdAt
       FROM links
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/links/:code - Stats for one code
router.get("/links/:code", async (req, res, next) => {
  try {
    const { code } = req.params;
    const result = await query(
      `SELECT code,
              target_url AS url,
              total_clicks AS totalClicks,
              last_clicked_at AS lastClickedAt,
              created_at AS createdAt
       FROM links
       WHERE code = $1`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Code not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/links/:code - Delete link
router.delete("/links/:code", async (req, res, next) => {
  try {
    const { code } = req.params;
    const result = await query("DELETE FROM links WHERE code = $1", [code]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Code not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
