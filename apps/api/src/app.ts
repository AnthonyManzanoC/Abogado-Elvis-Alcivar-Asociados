import { existsSync } from "node:fs";
import compression from "compression";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { db } from "./db.js";
import { adminRouter } from "./routes/admin.js";
import { publicRouter } from "./routes/public.js";
import { experienceRouter } from "./routes/experience.js";
import { clientAdminRouter, clientPortalRouter } from "./routes/client-portal.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.frontendUrls.includes(origin)) return callback(null, true);
    callback(new Error("Origen no permitido"));
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

if (existsSync(config.uploadsDir)) {
  app.use("/uploads", express.static(config.uploadsDir, {
    maxAge: config.nodeEnv === "production" ? "7d" : 0,
    // Media is public by design, but it must never execute if an old or
    // malformed upload is requested directly as a document.
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    }
  }));
}

app.get("/api/health", async (_req, res) => {
  await db.query("SELECT 1");
  res.json({ ok: true, service: "alcivar-legal-api", database: "connected" });
});

app.use("/api/public", publicRouter);
app.use("/api/public", clientPortalRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin", experienceRouter);
app.use("/api/admin", clientAdminRouter);

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Error inesperado";
  console.error(error);
  if (message === "Origen no permitido") return res.status(403).json({ error: message });
  if (message.includes("Solo se permiten") || message.includes("File too large")) return res.status(400).json({ error: message });
  return res.status(500).json({ error: "No fue posible completar la solicitud" });
});
