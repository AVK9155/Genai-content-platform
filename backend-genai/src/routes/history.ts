import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const historyRouter = Router();

const HistorySchema = z.object({
  preview: z.string().max(80),
  formats: z.array(z.string()),
});

// GET /api/history/:userId — list recent generation history (last 20)
historyRouter.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const items = await prisma.generationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const parsed = items.map((h) => ({
      ...h,
      formats: JSON.parse(h.formats || "[]"),
      time: new Date(h.createdAt).toLocaleTimeString(),
    }));
    return res.json({ history: parsed });
  } catch (err) {
    console.error("history list error:", err);
    return res.status(500).json({ error: "Could not load history" });
  }
});

// POST /api/history/:userId — append a history entry
historyRouter.post("/:userId", async (req, res) => {
  const { userId } = req.params;
  const parsed = HistorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { preview, formats } = parsed.data;

  try {
    const item = await prisma.generationHistory.create({
      data: {
        userId,
        preview,
        formats: JSON.stringify(formats),
      },
    });
    return res.json({
      item: {
        ...item,
        formats,
        time: new Date(item.createdAt).toLocaleTimeString(),
      },
    });
  } catch (err) {
    console.error("history save error:", err);
    return res.status(500).json({ error: "Could not save history" });
  }
});
