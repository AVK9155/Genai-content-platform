import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../lib/auth";

export const symptomsRouter = Router();

const symptomSchema = z.object({
  reporterName: z.string().min(2),
  reporterPhone: z.string().optional(),
  village: z.string(),
  district: z.string(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  symptomType: z.enum(["DIARRHEA", "VOMITING", "FEVER", "DEHYDRATION", "NAUSEA", "ABDOMINAL_PAIN", "BLOODY_STOOL", "HEADACHE", "SKIN_RASH", "JOINT_PAIN", "MULTIPLE"]),
  severity: z.enum(["MILD", "MODERATE", "SEVERE", "CRITICAL"]).optional(),
  onsetDate: z.string(),
  ageGroup: z.enum(["INFANT", "TODDLER", "CHILD", "ADULT", "ELDERLY"]).optional(),
  affectedCount: z.number().int().min(1).optional(),
  waterSourceUsed: z.string().optional(),
  notes: z.string().optional(),
  source: z.enum(["MOBILE", "WEB", "SMS", "IVR", "ASHA"]).optional(),
});

// Submit symptom report
symptomsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = symptomSchema.parse(req.body);
    const report = await prisma.symptomReport.create({
      data: {
        ...data,
        userId: req.user?.id,
        state: data.state || "Assam",
        onsetDate: new Date(data.onsetDate),
        affectedCount: data.affectedCount || 1,
        source: data.source || "WEB",
      },
    });

    await checkThresholds(data.village, data.district);
    res.status(201).json(report);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    res.status(500).json({ error: "Failed to submit symptom report" });
  }
});

// Get symptom reports
symptomsRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { village, district, symptomType, from, to, verified } = req.query;
    const where: any = {};
    if (village) where.village = village;
    if (district) where.district = district;
    if (symptomType) where.symptomType = symptomType;
    if (verified !== undefined) where.isVerified = verified === "true";
    if (from || to) {
      where.onsetDate = {};
      if (from) where.onsetDate.gte = new Date(from as string);
      if (to) where.onsetDate.lte = new Date(to as string);
    }

    const reports = await prisma.symptomReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(reports);
  } catch {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Get symptom aggregates by village/district
symptomsRouter.get("/aggregate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, days = "30" } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where: any = { createdAt: { gte: since } };
    if (district) where.district = district;

    const aggregate = await prisma.symptomReport.groupBy({
      by: ["village", "symptomType"],
      where,
      _count: { id: true },
      _sum: { affectedCount: true },
      orderBy: { _count: { id: "desc" } },
    });

    res.json(aggregate);
  } catch {
    res.status(500).json({ error: "Failed to aggregate reports" });
  }
});

// Get symptom trends (using ORM instead of raw SQL)
symptomsRouter.get("/trends", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, days = "30" } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where: any = { onsetDate: { gte: since } };
    if (district) where.district = district;

    const reports = await prisma.symptomReport.findMany({
      where,
      select: { onsetDate: true, symptomType: true, affectedCount: true },
    });

    // Group by date and symptom type
    const grouped: Record<string, Record<string, { count: number; totalAffected: number }>> = {};
    reports.forEach((r) => {
      const dateStr = r.onsetDate.toISOString().slice(0, 10);
      if (!grouped[dateStr]) grouped[dateStr] = {};
      if (!grouped[dateStr][r.symptomType]) grouped[dateStr][r.symptomType] = { count: 0, totalAffected: 0 };
      grouped[dateStr][r.symptomType].count++;
      grouped[dateStr][r.symptomType].totalAffected += r.affectedCount;
    });

    const trends = Object.entries(grouped).flatMap(([date, symptoms]) =>
      Object.entries(symptoms).map(([symptomType, data]) => ({
        date,
        symptomType,
        count: data.count,
        total_affected: data.totalAffected,
      }))
    ).sort((a, b) => b.date.localeCompare(a.date));

    res.json(trends);
  } catch {
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

// Verify a symptom report
symptomsRouter.put("/:id/verify", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { isVerified } = req.body;
    const report = await prisma.symptomReport.update({
      where: { id: req.params.id },
      data: { isVerified },
    });
    res.json(report);
  } catch {
    res.status(500).json({ error: "Failed to verify report" });
  }
});

// Threshold checking logic
async function checkThresholds(village: string, district: string) {
  const last7days = new Date();
  last7days.setDate(last7days.getDate() - 7);

  const caseCount = await prisma.symptomReport.count({
    where: {
      village,
      district,
      createdAt: { gte: last7days },
      symptomType: { in: ["DIARRHEA", "VOMITING", "BLOODY_STOOL"] },
    },
  });

  if (caseCount >= 5) {
    const existingAlert = await prisma.alert.findFirst({
      where: {
        village,
        district,
        isActive: true,
        createdAt: { gte: last7days },
      },
    });

    if (!existingAlert) {
      const latestReport = await prisma.symptomReport.findFirst({
        where: { village, district },
        orderBy: { createdAt: "desc" },
      });

      const riskLevel = caseCount >= 15 ? "CRITICAL" : caseCount >= 10 ? "HIGH" : "MEDIUM";

      await prisma.alert.create({
        data: {
          title: `Outbreak Alert: ${village}`,
          message: `${caseCount} cases of water-borne disease reported in ${village}, ${district} within 7 days.`,
          riskLevel: riskLevel as any,
          village,
          district,
          state: latestReport?.state || "Assam",
          latitude: latestReport?.latitude,
          longitude: latestReport?.longitude,
          triggerType: "THRESHOLD_BREACH",
        },
      });

      await prisma.caseVerification.create({
        data: {
          reportId: latestReport?.id || "",
          reportType: "symptom",
          status: "PENDING",
        },
      });
    }
  }
}
