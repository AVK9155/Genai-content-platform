import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../lib/auth";

export const tasksRouter = Router();

// Get tasks assigned to current user
tasksRouter.get("/my-tasks", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.taskAssignment.findMany({
      where: { assignedTo: req.user!.id },
      include: { case: true, creator: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get all tasks (for supervisors)
tasksRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, assignedTo, caseId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (caseId) where.caseId = caseId;

    const tasks = await prisma.taskAssignment.findMany({
      where,
      include: {
        assignee: { select: { name: true, village: true } },
        creator: { select: { name: true } },
        case: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(tasks);
  } catch {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Create task
tasksRouter.post("/", authenticate, authorize("PHC_DOCTOR", "DISTRICT_OFFICER", "STATE_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { caseId, assignedTo, taskType, description, priority, dueDate, latitude, longitude } = req.body;
    const task = await prisma.taskAssignment.create({
      data: {
        caseId,
        assignedTo,
        assignedBy: req.user!.id,
        taskType,
        description,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : undefined,
        latitude,
        longitude,
      },
      include: { case: true, assignee: { select: { name: true } } },
    });

    // Create notification for assignee
    await prisma.notification.create({
      data: {
        userId: assignedTo,
        title: `New Task: ${taskType}`,
        message: description,
        type: "TASK_ASSIGNMENT",
        channel: "IN_APP",
      },
    });

    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task status
tasksRouter.put("/:id/status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes } = req.body;
    const updateData: any = { status };
    if (notes) updateData.notes = notes;
    if (status === "COMPLETED") updateData.completedAt = new Date();

    const task = await prisma.taskAssignment.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(task);
  } catch {
    res.status(500).json({ error: "Failed to update task" });
  }
});
