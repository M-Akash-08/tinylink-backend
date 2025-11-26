import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import apiRouter from "./routes/api.js";
import { query } from "./db.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(morgan(config.env === "production" ? "combined" : "dev"));

  // Healthcheck (required: GET /healthz)
app.get("/healthz", (req, res) => {
  res.status(200).json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});


app.use("/api", apiRouter);



// Redirect short URLs
app.get("/:code", async (req, res, next) => {
  try {
    const { code } = req.params;

    // Get original URL
    const result = await query(
      `SELECT target_url FROM links WHERE code = $1`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Short URL not found");
    }

    const targetUrl = result.rows[0].target_url;

    // Update click count
    await query(
      `UPDATE links
       SET total_clicks = total_clicks + 1,
           last_clicked_at = NOW()
       WHERE code = $1`,
      [code]
    );

    return res.redirect(targetUrl);
  } catch (err) {
    next(err);
  }
});


  // 404 handler (for non /:code paths)
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

  // Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});


  return app;
}
