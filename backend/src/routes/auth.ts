import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateToken, authenticate, AuthRequest } from "../lib/auth";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["VILLAGER", "ASHA_WORKER", "PHC_DOCTOR", "DISTRICT_OFFICER", "STATE_ADMIN"]).optional(),
  language: z.string().optional(),
  village: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { ...data, passwordHash, role: data.role || "VILLAGER" },
    });

    const token = generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    res.status(500).json({ error: "Login failed" });
  }
});

// Get current user profile
authRouter.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, phone: true, name: true, role: true, language: true, village: true, district: true, state: true, latitude: true, longitude: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update profile
authRouter.put("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, language, village, district, state, latitude, longitude, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, language, village, district, state, latitude, longitude, phone },
      select: { id: true, email: true, phone: true, name: true, role: true, language: true, village: true, district: true, state: true, latitude: true, longitude: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
});
