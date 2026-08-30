import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../lib/auth";

export const reportsRouter = Router();

// Generate district report summary (JSON for frontend PDF generation)
reportsRouter.get("/district-summary", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, days = "30" } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where = { createdAt: { gte: since } };

    const [symptoms, waterReports, alerts, cases, weather] = await Promise.all([
      prisma.symptomReport.findMany({
        where: { ...where, ...(district ? { district: district as string } : {}) },
        orderBy: { createdAt: "desc" },
      }),
      prisma.waterQualityReport.findMany({
        where: { ...where },
        include: { source: true },
        orderBy: { testDate: "desc" },
      }),
      prisma.alert.findMany({
        where: { ...(district ? { district: district as string } : {}) },
        orderBy: { createdAt: "desc" },
      }),
      prisma.caseVerification.findMany({
        where: { ...where },
        include: { tasks: true },
      }),
      prisma.weatherData.findMany({
        where: { ...(district ? { district: district as string } : {}), date: { gte: since } },
        orderBy: { date: "desc" },
      }),
    ]);

    const summary = {
      period: { from: since.toISOString(), to: new Date().toISOString() },
      district: district || "All",
      totalSymptomReports: symptoms.length,
      symptomsByType: symptoms.reduce((acc: Record<string, number>, s) => {
        acc[s.symptomType] = (acc[s.symptomType] || 0) + 1;
        return acc;
      }, {}),
      totalAffected: symptoms.reduce((sum, s) => sum + s.affectedCount, 0),
      waterTestsConducted: waterReports.length,
      contaminatedSources: waterReports.filter((r) => r.ecoliPresence).length,
      activeAlerts: alerts.filter((a) => a.isActive).length,
      totalCases: cases.length,
      resolvedCases: cases.filter((c) => c.status === "RESOLVED").length,
      avgRainfall: weather.length ? weather.reduce((sum, w) => sum + (w.rainfallMm || 0), 0) / weather.length : 0,
    };

    res.json(summary);
  } catch {
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// Audit log for compliance
reportsRouter.get("/audit-log", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { entity, userId, days = "30" } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where: any = { createdAt: { gte: since } };
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});
