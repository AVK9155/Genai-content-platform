import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../lib/auth";

export const notificationsRouter = Router();

// Get user notifications
notificationsRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { unread } = req.query;
    const where: any = { userId: req.user!.id };
    if (unread === "true") where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Get unread count
notificationsRouter.get("/unread-count", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ count });
  } catch {
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

// Mark notification as read
notificationsRouter.put("/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(notification);
  } catch {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// Mark all as read
notificationsRouter.put("/mark-all-read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});
