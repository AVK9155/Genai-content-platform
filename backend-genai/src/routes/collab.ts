import { Router } from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const collabRouter = Router();

// Data store helpers (with in-memory fallback for serverless)
const memStores: Record<string, any[]> = {};
const DATA_DIR = path.join(__dirname, "../../data");

function readStore<T>(file: string): T[] {
  if (memStores[file]) return memStores[file] as T[];
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
    memStores[file] = JSON.parse(raw) as T[];
    return memStores[file] as T[];
  } catch {
    return memStores[file] || [];
  }
}

function writeStore<T>(file: string, data: T[]): void {
  memStores[file] = data;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Read-only filesystem in serverless environments — in-memory store persists during execution
  }
}

function uid(): string {
  return crypto.randomBytes(8).toString("hex");
}

// Schemas
const ShareSchema = z.object({
  source:  z.string().max(40000).optional().default(""),
  results: z.record(z.string()),
  formats: z.array(z.string()),
  tone:    z.string().default("professional"),
  author:  z.string().max(80).optional().default("Anonymous"),
  imagePreviewUrl: z.string().optional(),
});

const CommentSchema = z.object({
  shareId:   z.string(),
  fmt:       z.string(),
  paraIndex: z.number().int().min(0),
  text:      z.string().min(1).max(2000),
  author:    z.string().max(80).optional().default("Anonymous"),
});

const VersionSchema = z.object({
  sessionId: z.string(),
  fmt:       z.string(),
  label:     z.string().max(100),
  text:      z.string(),
});

const TeamProfileSchema = z.object({
  id:        z.string().optional(),
  name:      z.string().min(1).max(80),
  tone:      z.string().default("professional"),
  notes:     z.string().max(2000).optional().default(""),
  createdBy: z.string().max(80).optional().default("Anonymous"),
});

// SHARE LINK
collabRouter.post("/share", (req, res) => {
  const parsed = ShareSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const id = uid();
  const share = { id, createdAt: new Date().toISOString(), ...parsed.data };
  const shares = readStore<typeof share>("shares.json");
  shares.push(share);
  writeStore("shares.json", shares.slice(-500));
  return res.json({ shareId: id, url: `/shared/${id}` });
});

collabRouter.get("/share/:id", (req, res) => {
  const shares = readStore<any>("shares.json");
  const share = shares.find((s) => s.id === req.params.id);
  if (!share) return res.status(404).json({ error: "Share not found or expired." });
  const comments = readStore<any>("comments.json");
  return res.json({ share, comments: comments.filter((c) => c.shareId === req.params.id) });
});

// COMMENTS
collabRouter.post("/comment", (req, res) => {
  const parsed = CommentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid comment" });
  const comment = { id: uid(), createdAt: new Date().toISOString(), ...parsed.data };
  const comments = readStore<typeof comment>("comments.json");
  comments.push(comment);
  writeStore("comments.json", comments.slice(-2000));
  return res.json({ comment });
});

collabRouter.get("/comment/:shareId", (req, res) => {
  const comments = readStore<any>("comments.json");
  return res.json({ comments: comments.filter((c) => c.shareId === req.params.shareId) });
});

collabRouter.delete("/comment/:id", (req, res) => {
  const comments = readStore<any>("comments.json");
  writeStore("comments.json", comments.filter((c) => c.id !== req.params.id));
  return res.json({ ok: true });
});

// VERSION HISTORY
collabRouter.post("/version", (req, res) => {
  const parsed = VersionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid version" });
  const version = { id: uid(), createdAt: new Date().toISOString(), ...parsed.data };
  const versions = readStore<typeof version>("versions.json");
  versions.push(version);
  writeStore("versions.json", versions.slice(-5000));
  return res.json({ version });
});

collabRouter.get("/version/:sessionId/:fmt", (req, res) => {
  const versions = readStore<any>("versions.json");
  const fmtVersions = versions
    .filter((v) => v.sessionId === req.params.sessionId && v.fmt === req.params.fmt)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
  return res.json({ versions: fmtVersions });
});

// TEAM WORKSPACE
collabRouter.get("/team-profiles", (_req, res) => {
  return res.json({ profiles: readStore<any>("team-profiles.json") });
});

collabRouter.post("/team-profiles", (req, res) => {
  const parsed = TeamProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid profile" });
  const profiles = readStore<any>("team-profiles.json");
  if (parsed.data.id) {
    const idx = profiles.findIndex((p: any) => p.id === parsed.data.id);
    if (idx >= 0) {
      profiles[idx] = { ...profiles[idx], ...parsed.data, updatedAt: new Date().toISOString() };
      writeStore("team-profiles.json", profiles);
      return res.json({ profile: profiles[idx] });
    }
  }
  const profile = { id: uid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...parsed.data };
  profiles.push(profile);
  writeStore("team-profiles.json", profiles);
  return res.json({ profile });
});

collabRouter.delete("/team-profiles/:id", (req, res) => {
  const profiles = readStore<any>("team-profiles.json");
  writeStore("team-profiles.json", profiles.filter((p: any) => p.id !== req.params.id));
  return res.json({ ok: true });
});
