import express, { type Request, Response, NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";
import { registerRoutes } from "./routes";
import { config } from "./config";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler } from "./services/error-handler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// --- health endpoints (поставлены ДО статической отдачи) ---
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/readyz", (_req, res) => {
  // Грубая проверка: можем ли читать/писать артефакты
  try {
    const dir = config.artifactsDir || path.join(process.cwd(), "data", "artifacts");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "fs access error" });
  }
});

(async () => {
  const server = await registerRoutes(app);

  app.use(async (err: any, req: Request, res: Response, _next: NextFunction) => {
    try {
      const errorResponse = await errorHandler.handleApiError(err, {
        operation: `${req.method} ${req.path}`,
        projectId: req.params?.id,
        submissionId: req.params?.submissionId,
        runId: req.params?.runId
      });

      res.status(errorResponse.status).json({
        message: errorResponse.message,
        userMessage: errorResponse.userMessage,
        suggestion: errorResponse.suggestion
      });
    } catch (handlerError) {
      // Fallback если сам обработчик ошибок упал
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      res.status(status).json({ 
        message,
        userMessage: "Произошла неожиданная ошибка",
        suggestion: "Попробуйте повторить операцию позже"
      });
    }
    
    // Логируем ошибку для отладки
    console.error("API Error:", err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Раздача статики для продакшена
    const publicDir = path.join(process.cwd(), "dist", "public");
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
      // SPA fallback: все неизвестные пути — на index.html
      app.get("*", (_req, res) => {
        res.sendFile(path.join(publicDir, "index.html"));
      });
    } else {
      log(`Warning: Static directory not found: ${publicDir}`);
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, "127.0.0.1", () => {
    log(`serving on port ${port}`);
    // Log important config values to ensure env loaded (without secrets)
    log(`apiBaseUrl=${config.apiBaseUrl}`);
    log(`uploadDir=${config.uploadDir}`);
    log(`workDir=${config.workDir}`);
    log(`artifactsDir=${config.artifactsDir}`);
    log(`maxUploadMb=${config.maxUploadMb}`);
    log(`enablePytest=${String(config.enablePytest)}`);
  });
})();
