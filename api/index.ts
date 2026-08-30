import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { authRouter } from "../backend-genai/src/routes/auth";
import { profilesRouter } from "../backend-genai/src/routes/profiles";
import { usageRouter } from "../backend-genai/src/routes/usage";
import { historyRouter } from "../backend-genai/src/routes/history";
import { generateRouter } from "../backend-genai/src/routes/generate";
import { collabRouter } from "../backend-genai/src/routes/collab";
import { scrapeRouter } from "../backend-genai/src/routes/scrape";

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/usage", usageRouter);
app.use("/api/history", historyRouter);
app.use("/api/generate", generateRouter);
app.use("/api/collab", collabRouter);
app.use("/api/scrape", scrapeRouter);

// Health Check
app.get("/api/health", (_req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    apiKeyConfigured: hasKey,
    message: hasKey ? "GENAI Vercel Serverless is running ✓" : "⚠ GEMINI_API_KEY is not set",
  });
});

export default app;
