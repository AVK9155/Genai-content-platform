import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../lib/auth";

export const alertsRouter = Router();

// Get all alerts
alertsRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, riskLevel, active, limit = "50" } = req.query;
    const where: any = {};
    if (district) where.district = district;
    if (riskLevel) where.riskLevel = riskLevel;
    if (active !== undefined) where.isActive = active === "true";

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
    });
    res.json(alerts);
  } catch {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// Get active alerts for user's area
alertsRouter.get("/my-area", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const alerts = await prisma.alert.findMany({
      where: {
        isActive: true,
        OR: [
          { district: user.district || "" },
          { village: user.village || "" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(alerts);
  } catch {
    res.status(500).json({ error: "Failed to fetch area alerts" });
  }
});

// Create manual alert (officials only)
alertsRouter.post("/", authenticate, authorize("PHC_DOCTOR", "DISTRICT_OFFICER", "STATE_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, riskLevel, village, district, state, latitude, longitude } = req.body;
    const alert = await prisma.alert.create({
      data: {
        title,
        message,
        riskLevel,
        village,
        district,
        state: state || "Assam",
        latitude,
        longitude,
        triggerType: "MANUAL",
        userId: req.user!.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "CREATE",
        entity: "Alert",
        entityId: alert.id,
        details: JSON.stringify({ riskLevel, village, district }),
      },
    });

    res.status(201).json(alert);
  } catch {
    res.status(500).json({ error: "Failed to create alert" });
  }
});

// Dismiss an alert
alertsRouter.put("/:id/dismiss", authenticate, authorize("PHC_DOCTOR", "DISTRICT_OFFICER", "STATE_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json(alert);
  } catch {
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

// Get alert stats
alertsRouter.get("/stats", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [totalActive, byLevel, byDistrict] = await Promise.all([
      prisma.alert.count({ where: { isActive: true } }),
      prisma.alert.groupBy({ by: ["riskLevel"], where: { isActive: true }, _count: { id: true } }),
      prisma.alert.groupBy({ by: ["district"], where: { isActive: true }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    ]);
    res.json({ totalActive, byLevel, byDistrict });
  } catch {
    res.status(500).json({ error: "Failed to fetch alert stats" });
  }
});
