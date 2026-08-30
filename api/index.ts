import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import { generateRouter } from "../backend-genai/src/routes/generate";
import { collabRouter } from "../backend-genai/src/routes/collab";
import { scrapeRouter } from "../backend-genai/src/routes/scrape";

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));

// Mount Core GenAI Routers
app.use("/api/generate", generateRouter);
app.use("/api/collab", collabRouter);
app.use("/api/scrape", scrapeRouter);

// In-memory user store (serverless — no DB on this deployment)
const memoryUsers: Map<string, { id: string; name: string; email: string; role: string }> = new Map();
const memoryProfiles: Record<string, any>[] = [];
const memoryHistory: Record<string, any>[] = [];

// POST /api/auth/signin — look up user by email, reject if not found
app.post("/api/auth/signin", (req: Request, res: Response) => {
  const email = (req.body.email || "").toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "Email is required." });

  const user = memoryUsers.get(email);
  if (!user) {
    return res.status(404).json({
      error: "No account found for that email. Please register first."
    });
  }
  res.json({ user, token: "session-token" });
});

// POST /api/auth/register — create a new user (name + email required)
app.post("/api/auth/register", (req: Request, res: Response) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const name = (req.body.name || "").trim();

  if (!email || !name) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  // If user already exists with this email, return them (idempotent)
  const existing = memoryUsers.get(email);
  if (existing) {
    return res.json({ user: existing, token: "session-token" });
  }

  const user = { id: "user-" + Date.now(), name, email, role: "CREATOR" };
  memoryUsers.set(email, user);
  res.status(201).json({ user, token: "session-token" });
});

// GET /api/auth/accounts — list registered workspaces
app.get("/api/auth/accounts", (_req: Request, res: Response) => {
  const accounts = Array.from(memoryUsers.values()).map(u => ({ id: u.id, name: u.name, email: u.email }));
  res.json({ accounts });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Profiles
app.get("/api/profiles", (_req: Request, res: Response) => {
  res.json({ profiles: memoryProfiles });
});
app.post("/api/profiles", (req: Request, res: Response) => {
  const profile = { id: "prof-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  memoryProfiles.push(profile);
  res.status(201).json({ profile });
});
app.delete("/api/profiles/:id", (req: Request, res: Response) => {
  const idx = memoryProfiles.findIndex(p => p.id === req.params.id);
  if (idx !== -1) memoryProfiles.splice(idx, 1);
  res.json({ ok: true });
});

// History
app.get("/api/history", (_req: Request, res: Response) => {
  res.json({ history: memoryHistory });
});
app.post("/api/history", (req: Request, res: Response) => {
  const entry = { id: "hist-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  memoryHistory.unshift(entry);
  if (memoryHistory.length > 50) memoryHistory.pop();
  res.status(201).json({ entry });
});

// Usage stats
app.get("/api/usage", (_req: Request, res: Response) => {
  res.json({
    totalGenerations: 0,
    totalTokens: 0,
    groundingAccuracy: 0,
    formatBreakdown: {}
  });
});

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    apiKeyConfigured: hasKey,
    model: process.env.AI_MODEL || "gemini-3.1-flash-lite",
    message: hasKey ? "GENAI Serverless Backend is live ✓" : "⚠ GEMINI_API_KEY is not set",
  });
});

export default app;
