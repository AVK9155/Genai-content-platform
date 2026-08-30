import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../lib/auth";

export const dashboardRouter = Router();

// Main dashboard stats
dashboardRouter.get("/stats", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district } = req.query;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const districtFilter = district ? { district: district as string } : {};

    const [
      totalSymptoms,
      recentSymptoms,
      totalWaterReports,
      recentWaterReports,
      activeAlerts,
      pendingCases,
      totalUsers,
      crowdReports,
    ] = await Promise.all([
      prisma.symptomReport.count({ where: districtFilter }),
      prisma.symptomReport.count({ where: { ...districtFilter, createdAt: { gte: sevenDaysAgo } } }),
      prisma.waterQualityReport.count(),
      prisma.waterQualityReport.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.alert.count({ where: { isActive: true, ...districtFilter } }),
      prisma.caseVerification.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.crowdsourcedReport.count({ where: { ...districtFilter, createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    res.json({
      totalSymptoms,
      recentSymptoms,
      totalWaterReports,
      recentWaterReports,
      activeAlerts,
      pendingCases,
      totalUsers,
      crowdReports,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// GIS hotspot data
dashboardRouter.get("/hotspots", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, days = "30" } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where: any = { createdAt: { gte: since } };
    if (district) where.district = district;

    const clusters = await prisma.symptomReport.groupBy({
      by: ["village"],
      where,
      _count: { id: true },
      _sum: { affectedCount: true },
      _avg: { latitude: true, longitude: true },
      orderBy: { _count: { id: "desc" } },
    });

    const contaminatedSources = await prisma.waterSource.findMany({
      where: { isContaminated: true, ...(district ? { district: district as string } : {}) },
      select: { id: true, name: true, type: true, latitude: true, longitude: true, village: true, district: true },
    });

    const riskScores = await prisma.riskScore.findMany({
      where: { validUntil: { gte: new Date() }, ...(district ? { district: district as string } : {}) },
      orderBy: { score: "desc" },
    });

    res.json({ clusters, contaminatedSources, riskScores });
  } catch {
    res.status(500).json({ error: "Failed to fetch hotspots" });
  }
});

// Trend data for charts (SQLite-compatible using ORM instead of raw SQL)
dashboardRouter.get("/trends", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, days = "30" } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    // Get all symptom reports since the date, then group by date in JS
    const symptomWhere: any = { createdAt: { gte: since } };
    if (district) symptomWhere.district = district;

    const allSymptoms = await prisma.symptomReport.findMany({
      where: symptomWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const dailyMap: Record<string, number> = {};
    allSymptoms.forEach((s) => {
      const dateStr = s.createdAt.toISOString().slice(0, 10);
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
    });
    const dailyCases = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    // Water tests daily
    const allWaterTests = await prisma.waterQualityReport.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, ecoliPresence: true },
      orderBy: { createdAt: "asc" },
    });
    const waterMap: Record<string, { count: number; contaminated: number }> = {};
    allWaterTests.forEach((w) => {
      const dateStr = w.createdAt.toISOString().slice(0, 10);
      if (!waterMap[dateStr]) waterMap[dateStr] = { count: 0, contaminated: 0 };
      waterMap[dateStr].count++;
      if (w.ecoliPresence) waterMap[dateStr].contaminated++;
    });
    const dailyWaterTests = Object.entries(waterMap).map(([date, v]) => ({
      date,
      count: v.count,
      contaminated: v.contaminated,
    }));

    const symptomsByType = await prisma.symptomReport.groupBy({
      by: ["symptomType"],
      where: { createdAt: { gte: since }, ...(district ? { district: district as string } : {}) },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const casesByDistrict = await prisma.symptomReport.groupBy({
      by: ["district"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _sum: { affectedCount: true },
      orderBy: { _count: { id: "desc" } },
    });

    res.json({ dailyCases, dailyWaterTests, symptomsByType, casesByDistrict });
  } catch {
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

// ASHA worker dashboard
dashboardRouter.get("/asha", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const [assignedTasks, recentAlerts, villageReports] = await Promise.all([
      prisma.taskAssignment.findMany({
        where: { assignedTo: user.id, status: { in: ["PENDING", "IN_PROGRESS"] } },
        include: { case: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.alert.findMany({
        where: { village: user.village || "", district: user.district || "", isActive: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.symptomReport.findMany({
        where: { village: user.village || "", district: user.district || "" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    res.json({ assignedTasks, recentAlerts, villageReports });
  } catch {
    res.status(500).json({ error: "Failed to fetch ASHA dashboard" });
  }
});
