import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const profilesRouter = Router();

const ProfileSchema = z.object({
  name: z.string().min(1).max(100),
  tone: z.string().optional().default("professional"),
  notes: z.string().optional().default(""),
});

// GET /api/profiles/:userId — list all brand voice profiles for a user
profilesRouter.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const profiles = await prisma.brandVoiceProfile.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
    return res.json({ profiles });
  } catch (err) {
    console.error("profiles list error:", err);
    return res.status(500).json({ error: "Could not load profiles" });
  }
});

// POST /api/profiles/:userId — create or update a profile (upsert by name)
profilesRouter.post("/:userId", async (req, res) => {
  const { userId } = req.params;
  const parsed = ProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { name, tone, notes } = parsed.data;

  try {
    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const profile = await prisma.brandVoiceProfile.upsert({
      where: { userId_name: { userId, name } },
      update: { tone: tone ?? "professional", notes: notes ?? "" },
      create: { userId, name, tone: tone ?? "professional", notes: notes ?? "" },
    });
    return res.json({ profile });
  } catch (err) {
    console.error("profile save error:", err);
    return res.status(500).json({ error: "Could not save profile" });
  }
});

// DELETE /api/profiles/:userId/:name — delete a profile by name
profilesRouter.delete("/:userId/:name", async (req, res) => {
  const { userId, name } = req.params;
  try {
    await prisma.brandVoiceProfile.deleteMany({
      where: { userId, name: decodeURIComponent(name) },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("profile delete error:", err);
    return res.status(500).json({ error: "Could not delete profile" });
  }
});
