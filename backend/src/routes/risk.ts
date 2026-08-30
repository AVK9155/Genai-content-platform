import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../lib/auth";

export const riskRouter = Router();

// Calculate risk scores for all villages in a district
riskRouter.post("/calculate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district } = req.body;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get unique villages with symptom reports
    const villages = await prisma.symptomReport.findMany({
      where: { district, createdAt: { gte: thirtyDaysAgo } },
      select: { village: true, latitude: true, longitude: true },
      distinct: ["village"],
    });

    const scores = [];

    for (const village of villages) {
      // Factor 1: Symptom count (0-30)
      const recentSymptoms = await prisma.symptomReport.count({
        where: { village: village.village, district, createdAt: { gte: sevenDaysAgo } },
      });
      const symptomScore = Math.min(recentSymptoms * 6, 30);

      // Factor 2: Water quality (0-30)
      const recentWaterReports = await prisma.waterQualityReport.findMany({
        where: {
          source: { village: village.village, district },
          testDate: { gte: thirtyDaysAgo },
        },
      });
      const contaminatedCount = recentWaterReports.filter((r) => r.ecoliPresence).length;
      const waterScore = recentWaterReports.length > 0
        ? Math.min((contaminatedCount / recentWaterReports.length) * 30, 30)
        : 10; // Default risk when no data

      // Factor 3: Rainfall (0-20)
      const recentRainfall = await prisma.weatherData.findMany({
        where: {
          district,
          date: { gte: sevenDaysAgo },
        },
      });
      const totalRainfall = recentRainfall.reduce((sum, w) => sum + (w.rainfallMm || 0), 0);
      const rainfallScore = Math.min(totalRainfall / 50, 1) * 20;

      // Factor 4: Historical outbreaks (0-20)
      const historicalCases = await prisma.symptomReport.count({
        where: {
          village: village.village,
          district,
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      const historicalScore = Math.min(historicalCases * 2, 20);

      // Calculate total score
      const totalScore = symptomScore + waterScore + rainfallScore + historicalScore;
      const riskLevel = totalScore >= 75 ? "CRITICAL" : totalScore >= 50 ? "HIGH" : totalScore >= 25 ? "MEDIUM" : "LOW";

      // Save risk score
      const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      const riskRecord = await prisma.riskScore.create({
        data: {
          village: village.village,
          district,
          state: "Assam",
          latitude: village.latitude,
          longitude: village.longitude,
          riskLevel: riskLevel as any,
          score: totalScore,
          factors: JSON.stringify({
            symptomScore,
            waterScore,
            rainfallScore,
            historicalScore,
            recentSymptoms,
            contaminatedCount,
            totalRainfall: Math.round(totalRainfall),
          }),
          calculatedAt: now,
          validUntil,
        },
      });

      scores.push(riskRecord);

      // Auto-generate alert if high risk
      if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
        const existingAlert = await prisma.alert.findFirst({
          where: { village: village.village, district, isActive: true },
        });

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              title: `Risk Alert: ${village.village}`,
              message: `${riskLevel} risk detected in ${village.village}, ${district}. Score: ${Math.round(totalScore)}/100. Recent cases: ${recentSymptoms}, Contaminated sources: ${contaminatedCount}.`,
              riskLevel: riskLevel as any,
              village: village.village,
              district,
              state: "Assam",
              latitude: village.latitude,
              longitude: village.longitude,
              triggerType: "ANOMALY_DETECTED",
            },
          });
        }
      }
    }

    res.json({ calculated: scores.length, scores });
  } catch {
    res.status(500).json({ error: "Failed to calculate risk scores" });
  }
});

// Get current risk scores
riskRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, level } = req.query;
    const where: any = { validUntil: { gte: new Date() } };
    if (district) where.district = district;
    if (level) where.riskLevel = level;

    const scores = await prisma.riskScore.findMany({
      where,
      orderBy: { score: "desc" },
    });
    res.json(scores);
  } catch {
    res.status(500).json({ error: "Failed to fetch risk scores" });
  }
});
