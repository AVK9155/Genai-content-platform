import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const authRouter = Router();

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const SignInSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
});

// POST /api/auth/register — create a new user (reject duplicates)
authRouter.post("/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues?.[0]?.message || "Invalid input";
    return res.status(400).json({ error: errorMsg, details: parsed.error.flatten() });
  }

  const { name, email } = parsed.data;
  const normalEmail = email.toLowerCase().trim();
  const normalName = name.trim();

  try {
    // 1. Check if email already exists
    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalEmail },
    });
    if (existingByEmail) {
      return res.status(409).json({
        error: `An account with email "${normalEmail}" already exists. Please sign in instead.`,
        code: "EMAIL_EXISTS",
        email: normalEmail,
      });
    }

    // 2. Check if username / name already taken
    const existingByName = await prisma.user.findFirst({
      where: { name: { equals: normalName } },
    });
    if (existingByName) {
      return res.status(409).json({
        error: `Username "${normalName}" is already taken. Please choose another username or sign in.`,
        code: "USERNAME_EXISTS",
        name: normalName,
      });
    }

    // 3. Create the new user
    const user = await prisma.user.create({
      data: {
        name: normalName,
        email: normalEmail,
      },
    });

    return res.status(201).json({
      user,
      message: "Registration successful. Please sign in to your workspace.",
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Could not create workspace. Please try again." });
  }
});

// POST /api/auth/signin — look up user by email or username
authRouter.post("/signin", async (req, res) => {
  const parsed = SignInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please enter your email or username." });
  }

  const rawInput = parsed.data.email.trim();
  const normalEmail = rawInput.toLowerCase();

  try {
    // Search by email or by name/username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalEmail },
          { name: { equals: rawInput } },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({
        error: `No account found for "${rawInput}". Please register first before signing in.`,
        code: "NOT_REGISTERED",
        identifier: rawInput,
      });
    }

    return res.json({ user, message: "Signed in successfully" });
  } catch (err) {
    console.error("signin error:", err);
    return res.status(500).json({ error: "Sign-in failed. Please try again." });
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
