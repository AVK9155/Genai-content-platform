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

// Lightweight Fallback for auth/profiles/usage/history (in-memory for serverless)
const memoryUsers: Map<string, { id: string; name: string; email: string; role: string }> = new Map();
const memoryProfiles: Record<string, any>[] = [];
const memoryHistory: Record<string, any>[] = [];

// Seed default user
memoryUsers.set("damubalaji144@gmail.com", {
  id: "user-1",
  name: "Damu Balaji",
  email: "damubalaji144@gmail.com",
  role: "CREATOR"
});

app.get("/api/auth/me", (_req: Request, res: Response) => {
  res.json({ user: { id: "demo-user", email: "damubalaji144@gmail.com", name: "Damu Balaji", role: "CREATOR" } });
});

app.post("/api/auth/signin", (req: Request, res: Response) => {
  const email = (req.body.email || "").toLowerCase().trim();
  let user = memoryUsers.get(email);
  if (!user) {
    const name = email ? (email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1)) : "Creator";
    user = { id: "user-" + Date.now(), name, email: email || "damubalaji144@gmail.com", role: "CREATOR" };
    memoryUsers.set(email, user);
  }
  res.json({ user, token: "session-token" });
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const email = (req.body.email || "damubalaji144@gmail.com").toLowerCase().trim();
  let user = memoryUsers.get(email) || { id: "user-" + Date.now(), name: "Damu Balaji", email, role: "CREATOR" };
  res.json({ user, token: "session-token" });
});

app.post("/api/auth/register", (req: Request, res: Response) => {
  const email = (req.body.email || "damubalaji144@gmail.com").toLowerCase().trim();
  const name = (req.body.name || "Damu Balaji").trim();
  const user = { id: "user-" + Date.now(), name, email, role: "CREATOR" };
  memoryUsers.set(email, user);
  res.json({ user, token: "session-token" });
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

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

app.get("/api/history", (_req: Request, res: Response) => {
  res.json({ history: memoryHistory });
});
app.post("/api/history", (req: Request, res: Response) => {
  const entry = { id: "hist-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  memoryHistory.unshift(entry);
  if (memoryHistory.length > 50) memoryHistory.pop();
  res.status(201).json({ entry });
});

app.get("/api/usage", (_req: Request, res: Response) => {
  res.json({
    totalGenerations: 24,
    totalTokens: 18420,
    groundingAccuracy: 98.4,
    formatBreakdown: { blog: 8, linkedin: 12, twitter: 7, email: 5, video: 4, slides: 3, seo: 9, faq: 6 }
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
