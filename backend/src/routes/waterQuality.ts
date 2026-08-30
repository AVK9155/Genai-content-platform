import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../lib/auth";

export const waterQualityRouter = Router();

const reportSchema = z.object({
  sourceId: z.string(),
  testDate: z.string(),
  phLevel: z.number().min(0).max(14).optional(),
  turbidity: z.number().min(0).optional(),
  tds: z.number().min(0).optional(),
  chlorineResidual: z.number().min(0).optional(),
  ecoliPresence: z.boolean().optional(),
  coliformCount: z.number().int().min(0).optional(),
  otherPathogens: z.string().optional(),
  notes: z.string().optional(),
  enteredBy: z.string(),
  kitUsed: z.string().optional(),
});

// List water sources
waterQualityRouter.get("/sources", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, village, contaminated } = req.query;
    const where: any = {};
    if (district) where.district = district;
    if (village) where.village = village;
    if (contaminated === "true") where.isContaminated = true;

    const sources = await prisma.waterSource.findMany({
      where,
      orderBy: { name: "asc" },
    });
    res.json(sources);
  } catch {
    res.status(500).json({ error: "Failed to fetch water sources" });
  }
});

// Create water source
waterQualityRouter.post("/sources", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, latitude, longitude, village, district, state } = req.body;
    const source = await prisma.waterSource.create({
      data: { name, type, latitude, longitude, village, district, state: state || "Assam" },
    });
    res.status(201).json(source);
  } catch {
    res.status(500).json({ error: "Failed to create water source" });
  }
});

// Submit water quality report
waterQualityRouter.post("/reports", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = reportSchema.parse(req.body);
    const report = await prisma.waterQualityReport.create({
      data: {
        ...data,
        userId: req.user!.id,
        testDate: new Date(data.testDate),
      },
      include: { source: true },
    });

    if (data.ecoliPresence === true || (data.phLevel && (data.phLevel < 6.5 || data.phLevel > 8.5))) {
      await prisma.waterSource.update({
        where: { id: data.sourceId },
        data: { isContaminated: true, lastTested: new Date(data.testDate) },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "CREATE",
        entity: "WaterQualityReport",
        entityId: report.id,
        details: JSON.stringify({ sourceId: data.sourceId }),
      },
    });

    res.status(201).json(report);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// Get reports for a source
waterQualityRouter.get("/reports", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sourceId, district, from, to } = req.query;
    const where: any = {};
    if (sourceId) where.sourceId = sourceId;
    if (district) where.source = { district: district as string };
    if (from || to) {
      where.testDate = {};
      if (from) where.testDate.gte = new Date(from as string);
      if (to) where.testDate.lte = new Date(to as string);
    }

    const reports = await prisma.waterQualityReport.findMany({
      where,
      include: { source: true, user: { select: { name: true } } },
      orderBy: { testDate: "desc" },
      take: 100,
    });
    res.json(reports);
  } catch {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Get latest report per source (SQLite-compatible)
waterQualityRouter.get("/latest", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district } = req.query;
    const where: any = {};
    if (district) where.source = { district: district as string };

    const reports = await prisma.waterQualityReport.findMany({
      where,
      include: { source: true },
      orderBy: { testDate: "desc" },
    });

    // Deduplicate to get only latest per source
    const seen = new Set<string>();
    const latest = reports.filter((r) => {
      if (seen.has(r.sourceId)) return false;
      seen.add(r.sourceId);
      return true;
    });

    res.json(latest);
  } catch {
    res.status(500).json({ error: "Failed to fetch latest reports" });
  }
});
