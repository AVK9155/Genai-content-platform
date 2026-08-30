import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const usageRouter = Router();

const UsageLogSchema = z.object({
  formats: z.array(z.string()).optional().default([]),
  outputCount: z.number().int().optional().default(0),
  groundedCount: z.number().int().optional().default(0),
  checkedCount: z.number().int().optional().default(0),
  sourceChars: z.number().int().optional().default(0),
  regenerated: z.boolean().optional().default(false),
});

// GET /api/usage/:userId — list usage logs for a user (newest first, last 200)
usageRouter.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const logs = await prisma.usageLog.findMany({
      where: { userId },
      orderBy: { time: "desc" },
      take: 200,
    });
    // Parse JSON formats array back
    const parsed = logs.map((l) => ({
      ...l,
      formats: JSON.parse(l.formats || "[]"),
      time: l.time.getTime(),
    }));
    return res.json({ logs: parsed });
  } catch (err) {
    console.error("usage list error:", err);
    return res.status(500).json({ error: "Could not load usage logs" });
  }
});

// POST /api/usage/:userId — append a usage log entry
usageRouter.post("/:userId", async (req, res) => {
  const { userId } = req.params;
  const parsed = UsageLogSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { formats, outputCount, groundedCount, checkedCount, sourceChars, regenerated } = parsed.data;

  try {
    const log = await prisma.usageLog.create({
      data: {
        userId,
        formats: JSON.stringify(formats),
        outputCount,
        groundedCount,
        checkedCount,
        sourceChars,
        regenerated,
      },
    });
    return res.json({ log: { ...log, formats, time: log.time.getTime() } });
  } catch (err) {
    console.error("usage log error:", err);
    return res.status(500).json({ error: "Could not log usage" });
  }
});
