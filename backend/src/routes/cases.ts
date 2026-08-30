import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../lib/auth";

export const casesRouter = Router();

// Get all cases
casesRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, district } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (district) {
      where.OR = [
        { reportType: "symptom", reportId: { in: [] } },
      ];
      // We'll filter by related data
    }

    const cases = await prisma.caseVerification.findMany({
      where,
      include: { tasks: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(cases);
  } catch {
    res.status(500).json({ error: "Failed to fetch cases" });
  }
});

// Get single case
casesRouter.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const caseData = await prisma.caseVerification.findUnique({
      where: { id: req.params.id },
      include: { tasks: { include: { assignee: { select: { name: true, role: true } } } } },
    });
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    res.json(caseData);
  } catch {
    res.status(500).json({ error: "Failed to fetch case" });
  }
});

// Update case status
casesRouter.put("/:id/status", authenticate, authorize("PHC_DOCTOR", "DISTRICT_OFFICER", "STATE_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes, actionTaken } = req.body;
    const updateData: any = {
      status,
      verifiedBy: req.user!.id,
      verifiedAt: new Date(),
    };
    if (notes) updateData.notes = notes;
    if (actionTaken) updateData.actionTaken = actionTaken;
    if (status === "RESOLVED") updateData.resolvedAt = new Date();

    const caseData = await prisma.caseVerification.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(caseData);
  } catch {
    res.status(500).json({ error: "Failed to update case" });
  }
});

// Get pending cases count
casesRouter.get("/stats/pending", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await prisma.caseVerification.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    res.json(stats);
  } catch {
    res.status(500).json({ error: "Failed to fetch case stats" });
  }
});
