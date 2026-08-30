import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const authRouter = Router();

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const SignInSchema = z.object({
  email: z.string().email(),
});

// POST /api/auth/register — create or update a user (demo: no passwords)
authRouter.post("/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { name, email } = parsed.data;
  const normalEmail = email.toLowerCase().trim();

  try {
    // Upsert — if they register again with same email, update name
    const user = await prisma.user.upsert({
      where: { email: normalEmail },
      update: { name: name.trim() },
      create: { name: name.trim(), email: normalEmail },
    });
    return res.json({ user });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Could not create workspace" });
  }
});

// POST /api/auth/signin — look up user by email
authRouter.post("/signin", async (req, res) => {
  const parsed = SignInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const normalEmail = parsed.data.email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({ where: { email: normalEmail } });
    if (!user) {
      return res.status(404).json({ error: "No workspace found for that email — switch to Register to create one." });
    }
    return res.json({ user });
  } catch (err) {
    console.error("signin error:", err);
    return res.status(500).json({ error: "Sign-in failed" });
  }
});

// GET /api/auth/accounts — list all users (for "recent workspaces" picker)
authRouter.get("/accounts", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return res.json({ accounts: users });
  } catch (err) {
    console.error("accounts error:", err);
    return res.status(500).json({ error: "Could not list accounts" });
  }
});
