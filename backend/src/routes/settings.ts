import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../lib/auth";

export const settingsRouter = Router();

// Get all settings
settingsRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.systemSettings.findMany();
    const mapped: Record<string, string> = {};
    settings.forEach((s) => (mapped[s.key] = s.value));
    res.json(mapped);
  } catch {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update setting (admin only)
settingsRouter.put("/", authenticate, authorize("STATE_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { key, value, description } = req.body;
    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
    res.json(setting);
  } catch {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// Get threshold configuration
settingsRouter.get("/thresholds", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const defaults = {
      diarrhea_threshold_7days: "5",
      vomiting_threshold_7days: "3",
      bacterial_threshold: "1",
      turbidity_threshold: "5",
      ph_min: "6.5",
      ph_max: "8.5",
      tds_max: "500",
      risk_score_weights: JSON.stringify({
        waterQuality: 0.3,
        symptomCount: 0.3,
        rainfall: 0.2,
        historicalOutbreaks: 0.2,
      }),
    };
    res.json(defaults);
  } catch {
    res.status(500).json({ error: "Failed to fetch thresholds" });
  }
});
