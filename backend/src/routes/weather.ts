import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../lib/auth";

export const weatherRouter = Router();

// Get weather data for a district
weatherRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, days = "30" } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where: any = { date: { gte: since } };
    if (district) where.district = district;

    const data = await prisma.weatherData.findMany({
      where,
      orderBy: { date: "desc" },
    });
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// Store weather data (from IMD API or manual import)
weatherRouter.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, state, date, rainfallMm, temperature, humidity, windSpeed, source } = req.body;
    // SQLite upsert workaround: find first, then create or update
    const existing = await prisma.weatherData.findFirst({
      where: { district, state: state || "Assam", date: new Date(date) },
    });

    let data;
    if (existing) {
      data = await prisma.weatherData.update({
        where: { id: existing.id },
        data: { rainfallMm, temperature, humidity, windSpeed, source },
      });
    } else {
      data = await prisma.weatherData.create({
        data: { district, state: state || "Assam", date: new Date(date), rainfallMm, temperature, humidity, windSpeed, source: source || "IMD" },
      });
    }
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to store weather data" });
  }
});

// Get rainfall correlation with disease outbreaks (ORM instead of raw SQL)
weatherRouter.get("/correlation", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { district, days = "90" } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const weatherWhere: any = { date: { gte: since } };
    if (district) weatherWhere.district = district;

    const weatherData = await prisma.weatherData.findMany({
      where: weatherWhere,
      select: { date: true, rainfallMm: true },
      orderBy: { date: "asc" },
    });

    // Group rainfall by date
    const rainfallMap: Record<string, number> = {};
    weatherData.forEach((w) => {
      const dateStr = w.date.toISOString().slice(0, 10);
      rainfallMap[dateStr] = (rainfallMap[dateStr] || 0) + (w.rainfallMm || 0);
    });
    const rainfall = Object.entries(rainfallMap).map(([date, total_rainfall]) => ({
      date,
      total_rainfall: Math.round(total_rainfall),
    }));

    // Get symptom cases
    const symptomWhere: any = { createdAt: { gte: since } };
    if (district) symptomWhere.district = district;

    const symptoms = await prisma.symptomReport.findMany({
      where: symptomWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const casesMap: Record<string, number> = {};
    symptoms.forEach((s) => {
      const dateStr = s.createdAt.toISOString().slice(0, 10);
      casesMap[dateStr] = (casesMap[dateStr] || 0) + 1;
    });
    const cases = Object.entries(casesMap).map(([date, case_count]) => ({
      date,
      case_count: case_count,
    }));

    res.json({ rainfall, cases });
  } catch {
    res.status(500).json({ error: "Failed to fetch correlation data" });
  }
});
