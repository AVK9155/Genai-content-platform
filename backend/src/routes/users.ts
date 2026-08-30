import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../lib/auth";

export const usersRouter = Router();

// List all users (admin only)
usersRouter.get("/", authenticate, authorize("STATE_ADMIN", "DISTRICT_OFFICER"), async (req: AuthRequest, res: Response) => {
  try {
    const { role, district, search } = req.query;
    const where: any = {};
    if (role) where.role = role;
    if (district) where.district = district;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, phone: true, name: true, role: true, village: true, district: true, state: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get ASHA workers for a district
usersRouter.get("/asha-workers", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district } = req.query;
    const where: any = { role: "ASHA_WORKER", isActive: true };
    if (district) where.district = district;

    const workers = await prisma.user.findMany({
      where,
      select: { id: true, name: true, village: true, district: true, phone: true, latitude: true, longitude: true },
    });
    res.json(workers);
  } catch {
    res.status(500).json({ error: "Failed to fetch ASHA workers" });
  }
});

// Toggle user active status
usersRouter.put("/:id/toggle-active", authenticate, authorize("STATE_ADMIN", "DISTRICT_OFFICER"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});
