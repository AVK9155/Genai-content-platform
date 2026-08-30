import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

import { authRouter } from "./routes/auth";
import { profilesRouter } from "./routes/profiles";
import { usageRouter } from "./routes/usage";
import { historyRouter } from "./routes/history";
import { generateRouter } from "./routes/generate";
import { collabRouter } from "./routes/collab";
import { scrapeRouter } from "./routes/scrape";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3002", 10);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3002",
      "http://localhost:5173", // Vite dev server if used
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" }));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/usage", usageRouter);
app.use("/api/history", historyRouter);
app.use("/api/generate", generateRouter);
app.use("/api/collab", collabRouter);
app.use("/api/scrape", scrapeRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    apiKeyConfigured: hasKey,
    message: hasKey
      ? "GENAI Backend is running ✓"
      : "⚠ ANTHROPIC_API_KEY is not set — add it to backend-genai/.env",
  });
});

// ─── Serve index.html (static frontend) ────────────────────────────────────
// We serve index.html from the project root (one level up from backend-genai/)
const frontendPath = path.join(__dirname, "../../index.html");
const frontendDir = path.join(__dirname, "../../");

// Serve static files (JS libraries, images etc.) from the SIH root
app.use(express.static(frontendDir, { index: false }));

// Serve index.html for the root
app.get("/", (_req, res) => {
  res.sendFile(frontendPath, (err) => {
    if (err) {
      console.error("Could not serve index.html:", err.message);
      res.status(500).send("Could not serve the frontend. Ensure index.html is in the SIH root directory.");
    }
  });
});

// Serve shared view for /shared/:id
app.get("/shared/:id", (_req, res) => {
  const sharedPath = path.join(__dirname, "../../shared.html");
  res.sendFile(sharedPath, (err) => {
    if (err) res.status(404).send("Shared view not found.");
  });
});

// ─── Start (local server only) ────────────────────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("\n🚀 GENAI Backend is running!");
    console.log(`   App:    http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);

    const hasKey = !!process.env.GEMINI_API_KEY;
    if (!hasKey) {
      console.warn("\n⚠  WARNING: GEMINI_API_KEY is not set.");
      console.warn("   Add your key to backend-genai/.env and restart.\n");
    } else {
      console.log("   Google Gemini API key: ✓ configured\n");
    }
  });
}

export default app;

