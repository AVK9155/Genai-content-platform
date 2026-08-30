import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { waterQualityRouter } from "./routes/waterQuality";
import { symptomsRouter } from "./routes/symptoms";
import { crowdsourcedRouter } from "./routes/crowdsourced";
import { alertsRouter } from "./routes/alerts";
import { casesRouter } from "./routes/cases";
import { tasksRouter } from "./routes/tasks";
import { notificationsRouter } from "./routes/notifications";
import { dashboardRouter } from "./routes/dashboard";
import { weatherRouter } from "./routes/weather";
import { reportsRouter } from "./routes/reports";
import { settingsRouter } from "./routes/settings";
import { riskRouter } from "./routes/risk";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "", 10) || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/water-quality", waterQualityRouter);
app.use("/api/symptoms", symptomsRouter);
app.use("/api/crowdsourced", crowdsourcedRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/cases", casesRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/risk", riskRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve frontend build
const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🌊 Jal Suraksha API running on port ${PORT}`);
  console.log(`   Frontend served from: http://localhost:${PORT}`);
});

export default app;
