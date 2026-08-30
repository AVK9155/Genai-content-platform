import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../lib/auth";

export const crowdsourcedRouter = Router();

const reportSchema = z.object({
  reporterName: z.string().min(2),
  category: z.enum(["CONTAMINATED_WATER", "ILLNESS_CLUSTER", "BROKEN_PIPE", "OPEN_DRAINAGE", "DEAD_ANIMAL", "STAGNANT_WATER", "OTHER"]),
  description: z.string().min(10),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  village: z.string(),
  district: z.string(),
  state: z.string().optional(),
  photoUrl: z.string().optional(),
});

// Submit crowdsourced report (public - no auth required for villager use)
crowdsourcedRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = reportSchema.parse(req.body);
    const report = await prisma.crowdsourcedReport.create({
      data: {
        ...data,
        userId: req.user?.id,
        state: data.state || "Assam",
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

// Get all crowdsourced reports
crowdsourcedRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, status, category } = req.query;
    const where: any = {};
    if (district) where.district = district;
    if (status) where.status = status;
    if (category) where.category = category;

    const reports = await prisma.crowdsourcedReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(reports);
  } catch {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Get single report
crowdsourcedRouter.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.crowdsourcedReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// Update report status
crowdsourcedRouter.put("/:id/status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const report = await prisma.crowdsourcedReport.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(report);
  } catch {
    res.status(500).json({ error: "Failed to update report" });
  }
});

// Get report stats
crowdsourcedRouter.get("/stats/summary", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await prisma.crowdsourcedReport.groupBy({
      by: ["category", "status"],
      _count: { id: true },
    });
    res.json(stats);
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});
