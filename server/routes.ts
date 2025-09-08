import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { JsonStore } from "./store/db";
import type { Project, Submission } from "@shared/types";
import multer from "multer";
import https from "https";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { config } from "./config";
import { extractZipToRunDir, buildFileTree, readFile as readFileFromRoot } from "./services/archive";
import { runStaticCheck } from "./services/staticCheck";
import { runSubmission } from "./queue";
import { timelineService } from "./services/timeline";
import { errorHandler } from "./services/error-handler";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // GET /api/timeline — получить список событий таймлайна
  app.get("/api/timeline", async (_req, res, next) => {
    try {
      const events = await timelineService.getEvents();
      res.json(events);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/runs — получить прогоны проекта
  app.get("/api/projects/:id/runs", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const submissions = await submissionStore.list();
      const projectSubmissions = submissions.filter(s => s.projectId === projectId);
      
      const allRuns = projectSubmissions.flatMap(submission => 
        (submission.runs || []).map(run => ({
          ...run,
          submissionId: submission.id
        }))
      );

      res.json({
        projectId,
        projectName: project.name,
        runs: allRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/runs — получить все прогоны всех проектов
  app.get("/api/runs", async (_req, res, next) => {
    try {
      const projects = await projectStore.list();
      const submissions = await submissionStore.list();
      
      const projectRuns: any[] = [];
      
      for (const project of projects) {
        const projectSubmissions = submissions.filter(s => s.projectId === project.id);
        const allRuns = projectSubmissions.flatMap(submission => 
          (submission.runs || []).map(run => ({
            ...run,
            submissionId: submission.id
          }))
        );

        if (allRuns.length > 0) {
          projectRuns.push({
            projectId: project.id,
            projectName: project.name,
            runs: allRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          });
        }
      }

      res.json(projectRuns);
    } catch (err) {
      next(err);
    }
  });

  const projectStore = new JsonStore<Project>("projects");
  const submissionStore = new JsonStore<Submission>("submissions");
  const commentsStore = new JsonStore<any>("comments");

  app.get("/api/projects", async (_req, res, next) => {
    try {
      const items = await projectStore.list();
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/projects/:id", async (req, res, next) => {
    try {
      const item = await projectStore.get(req.params.id);
      if (!item) return res.status(404).json({ message: "Project not found" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  // COMMENTS API
  // Модель комментария: { id, projectId, file, line, severity, text, resolved, createdAt }

  // GET /api/projects/:id/comments — список комментариев проекта
  app.get("/api/projects/:id/comments", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const all = await commentsStore.list();
      const items = all.filter((c) => c.projectId === projectId);
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/projects/:id/comments — создать комментарий
  app.post("/api/projects/:id/comments", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const body = req.body ?? {};
      const file = typeof body.file === "string" ? body.file : undefined;
      const line = typeof body.line === "number" ? body.line : undefined;
      const severity = typeof body.severity === "string" ? body.severity : undefined;
      const text = typeof body.text === "string" ? body.text : undefined;
      const resolved = typeof body.resolved === "boolean" ? body.resolved : false;

      if (!text || !file) {
        return res.status(400).json({ message: "Fields 'file' and 'text' are required" });
      }

      const comment = {
        id: randomUUID(),
        projectId,
        file,
        line,
        severity,
        text,
        resolved,
        createdAt: new Date().toISOString(),
      };

      await commentsStore.save(comment);
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/projects/:id/comments/:commentId — обновить комментарий
  app.put("/api/projects/:id/comments/:commentId", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const commentId = req.params.commentId;

      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const updated = await commentsStore.update(commentId, (existing: any) => {
        if (!existing || existing.projectId !== projectId) return existing;
        const body = req.body ?? {};
        const next = { ...existing };
        if (typeof body.file === "string") next.file = body.file;
        if (typeof body.line === "number") next.line = body.line;
        if (typeof body.severity === "string") next.severity = body.severity;
        if (typeof body.text === "string") next.text = body.text;
        if (typeof body.resolved === "boolean") next.resolved = body.resolved;
        next.updatedAt = new Date().toISOString();
        return next;
      });

      if (!updated || updated.projectId !== projectId) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/projects/:id/comments/:commentId — удалить комментарий
  app.delete("/api/projects/:id/comments/:commentId", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const commentId = req.params.commentId;

      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const entity = await commentsStore.get(commentId);
      if (!entity || entity.projectId !== projectId) {
        return res.status(404).json({ message: "Comment not found" });
      }

      await commentsStore.remove(commentId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // POST /api/projects/:id/run — поставить прогон проверки в очередь
  app.post("/api/projects/:id/run", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.lastSubmissionId) return res.status(400).json({ message: "Project has no submission" });

      const submission = await submissionStore.get(project.lastSubmissionId);
      if (!submission) return res.status(404).json({ message: "Submission not found" });

      const toolchain = (req.body?.toolchain as string) || "tests";
      const { runId, status } = runSubmission({ projectId, submissionId: submission.id, toolchain });
      
      // Логируем событие запуска проверки
      await timelineService.addEvent("run_started", {
        projectId,
        submissionId: submission.id,
        runId,
        message: `Запущена проверка "${toolchain}" для проекта "${project.name}"`,
        details: { toolchain }
      });
      
      res.json({ runId, status });
    } catch (err) {
      next(err);
    }
  });

  // Get run status: GET /api/projects/:id/run/:runId/status
  app.get('/api/projects/:id/run/:runId/status', async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const runId = req.params.runId;
      
      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.lastSubmissionId) return res.status(400).json({ message: "Project has no submission" });

      const submission = await submissionStore.get(project.lastSubmissionId);
      if (!submission) return res.status(404).json({ message: "Submission not found" });

      const run = submission.runs?.find(r => r.id === runId);
      if (!run) return res.status(404).json({ message: "Run not found" });

      res.json({ 
        runId: run.id,
        status: run.status,
        durationMs: run.durationMs,
        reportId: run.reportId
      });
    } catch (err) {
      next(err);
    }
  });

  // Upload endpoint: POST /api/projects/upload
  // Accepts multipart/form-data with field "file" (zip ≤ MAX_UPLOAD_MB)
  // Saves to UPLOAD_DIR and creates Project + Submission
  // Responds: { projectId, submissionId, name, filesCount: 0 }

  // Ensure upload directory exists
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, config.uploadDir);
      },
      filename: (_req, file, cb) => {
        // preserve original name, add uuid prefix to avoid collisions
        const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}_${safeOriginal}`);
      },
    }),
    limits: {
      fileSize: config.maxUploadMb * 1024 * 1024,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const isZip = ext === ".zip" || file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed";
      if (!isZip) {
        return cb(new Error("Only ZIP files are allowed"));
      }
      cb(null, true);
    },
  });

  app.post("/api/projects/upload", upload.single("file"), async (req, res, next) => {
    try {
      // Режим 1: импорт по ссылке на GitHub репозиторий { repoUrl }
      if (!req.file && req.is("application/json") && typeof req.body?.repoUrl === "string") {
        const rawUrl = String(req.body.repoUrl).trim();
        // Поддерживаем форматы:
        // - https://github.com/{owner}/{repo}
        // - https://github.com/{owner}/{repo}/tree/{branch}
        // - git@github.com:{owner}/{repo}.git (конвертируем)
        let url = rawUrl;
        if (url.startsWith("git@github.com:")) {
          const tail = url.replace(/^git@github.com:/, "").replace(/\.git$/i, "");
          url = `https://github.com/${tail}`;
        }

        const m = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/#]+)(?:\/(?:tree|branch)\/([^#?]+))?/i);
        if (!m) {
          return res.status(400).json({ message: "Unsupported repoUrl. Use https://github.com/{owner}/{repo}[/tree/{branch}]" });
        }
        const owner = m[1];
        const repo = m[2].replace(/\.git$/i, "");
        const branchCandidate = m[3];

        const candidateBranches = [branchCandidate, "main", "master"].filter(Boolean) as string[];

        // Попытка скачать архив с codeload по кандидатам веток
        const tryDownload = (branch: string): Promise<{ filePath: string; originalName: string } > => {
          return new Promise((resolve, reject) => {
            const fileName = `${Date.now()}_${owner}-${repo}-${branch}.zip`;
            const filePath = path.join(config.uploadDir, fileName);
            const url = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${encodeURIComponent(branch)}`;

            const fileStream = fs.createWriteStream(filePath);
            const reqHttps = https.get(url, (resp) => {
              if (resp.statusCode && resp.statusCode >= 400) {
                fileStream.close();
                fs.rmSync(filePath, { force: true });
                reject(new Error(`Download failed: ${resp.statusCode}`));
                return;
              }
              resp.pipe(fileStream);
              fileStream.on("finish", () => {
                fileStream.close();
                resolve({ filePath, originalName: `${repo}-${branch}.zip` });
              });
            });
            reqHttps.on("error", (err) => {
              fileStream.close();
              fs.rmSync(filePath, { force: true });
              reject(err);
            });
          });
        };

        let downloaded: { filePath: string; originalName: string } | undefined;
        let lastErr: any;
        for (const br of candidateBranches) {
          try {
            downloaded = await tryDownload(br);
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!downloaded) {
          const errorResponse = await errorHandler.handleApiError(
            new Error(`Unable to download repo archive for ${owner}/${repo}. ${lastErr?.message ?? ""}`),
            { operation: "github_download", projectId: undefined }
          );
          return res.status(errorResponse.status).json({
            message: errorResponse.message,
            userMessage: errorResponse.userMessage,
            suggestion: errorResponse.suggestion
          });
        }

        const { filePath: uploadedFilePath, originalName } = downloaded;
        const baseName = path.basename(originalName, path.extname(originalName));

        const nowIso = new Date().toISOString();
        const projectId = randomUUID();
        const submissionId = randomUUID();

        const project: Project = {
          id: projectId,
          name: `${owner}/${repo}`,
          createdAt: nowIso,
          updatedAt: nowIso,
          status: "ready",
          lastSubmissionId: submissionId,
        };

        const submission: Submission = {
          id: submissionId,
          projectId,
          createdAt: nowIso,
          author: "anonymous",
          message: `GitHub import ${owner}/${repo}`,
          artifactPath: uploadedFilePath,
          runs: [],
        };

        await projectStore.save(project);
        await submissionStore.save(submission);

        // Логируем событие загрузки
        await timelineService.addEvent("uploaded", {
          projectId,
          submissionId,
          message: `Проект "${project.name}" загружен из GitHub`,
          details: { source: "github", repo: `${owner}/${repo}` }
        });

        return res.json({ projectId, submissionId, name: project.name, filesCount: 0 });
      }

      // Режим 2: стандартная загрузка zip-файла
      if (!req.file) {
        const errorResponse = await errorHandler.handleApiError(
          new Error("No file uploaded. Expected field 'file' with ZIP or JSON { repoUrl }"),
          { operation: "file_upload", projectId: undefined }
        );
        return res.status(errorResponse.status).json({
          message: errorResponse.message,
          userMessage: errorResponse.userMessage,
          suggestion: errorResponse.suggestion
        });
      }

      const uploadedFilePath = path.resolve(req.file.path);
      const originalName = req.file.originalname;
      const baseName = path.basename(originalName, path.extname(originalName));

      const nowIso = new Date().toISOString();
      const projectId = randomUUID();
      const submissionId = randomUUID();

      const project: Project = {
        id: projectId,
        name: baseName || "Uploaded Project",
        createdAt: nowIso,
        updatedAt: nowIso,
        status: "ready",
        lastSubmissionId: submissionId,
      };

      const submission: Submission = {
        id: submissionId,
        projectId,
        createdAt: nowIso,
        author: "anonymous",
        message: `Upload ${originalName}`,
        artifactPath: uploadedFilePath,
        runs: [],
      };

      await projectStore.save(project);
      await submissionStore.save(submission);

      // Логируем событие загрузки
      await timelineService.addEvent("uploaded", {
        projectId,
        submissionId,
        message: `Проект "${project.name}" загружен`,
        details: { source: "upload", filename: originalName }
      });

      res.json({
        projectId,
        submissionId,
        name: project.name,
        filesCount: 0,
      });
    } catch (err) {
      next(err);
    }
  });

  // Helpers for files API
  const getProjectRootDir = async (projectId: string): Promise<string> => {
    try {
      const project = await projectStore.get(projectId);
      if (!project) {
        const err: any = new Error("Project not found");
        err.status = 404;
        throw err;
      }
      const submissionId = project.lastSubmissionId;
      if (!submissionId) {
        const err: any = new Error("Project has no submission");
        err.status = 404;
        throw err;
      }
      const submission = await submissionStore.get(submissionId);
      if (!submission || !submission.artifactPath) {
        const err: any = new Error("Submission artifact not found");
        err.status = 404;
        throw err;
      }

      const runDir = path.resolve(config.workDir, projectId, submissionId);
      // If not extracted yet (dir missing or empty), extract
      const dirExists = fs.existsSync(runDir);
      const dirHasItems = dirExists && fs.readdirSync(runDir).length > 0;
      if (!dirHasItems) {
        try {
          await extractZipToRunDir(submission.artifactPath, projectId, submissionId);
        } catch (extractError) {
          const err: any = new Error(`Failed to extract project files: ${extractError instanceof Error ? extractError.message : String(extractError)}`);
          err.status = 500;
          throw err;
        }
      }
      return runDir;
    } catch (error) {
      // Логируем ошибку через errorHandler
      await errorHandler.handleApiError(error, {
        operation: "getProjectRootDir",
        projectId
      });
      throw error;
    }
  };

  const sanitizeAndResolve = (rootDir: string, qPath: string | undefined): { abs: string; rel: string } => {
    const requested = (qPath ?? "/").toString();
    // Disallow any '..' segments
    if (requested.includes("..")) {
      const err: any = new Error("Invalid path");
      err.status = 400;
      throw err;
    }
    const trimmed = requested.replace(/^\/+/, "");
    const rel = trimmed === "" ? "" : trimmed;
    const abs = path.resolve(rootDir, rel);
    const normalizedRoot = path.resolve(rootDir);
    if (!abs.startsWith(normalizedRoot + path.sep) && abs !== normalizedRoot) {
      const err: any = new Error("Path is outside of project root");
      err.status = 400;
      throw err;
    }
    return { abs, rel };
  };

  // GET /api/projects/:id/files?path=/ — отдаёт дерево (или поддерево)
  app.get("/api/projects/:id/files", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const rootDir = await getProjectRootDir(projectId);
      const { abs, rel } = sanitizeAndResolve(rootDir, req.query.path as string | undefined);

      // Walk starting at abs, but compute paths relative to project root
      const walk = (absPath: string): any => {
        const stat = fs.statSync(absPath);
        const relFromRoot = path.relative(rootDir, absPath);
        const node: any = {
          name: path.basename(absPath) || "/",
          path: relFromRoot.replace(/\\/g, "/"),
          isDir: stat.isDirectory(),
        };
        if (node.isDir) {
          const entries = fs.readdirSync(absPath, { withFileTypes: true })
            .map(d => d.name)
            .sort((a, b) => a.localeCompare(b));
          node.children = entries.map(name => walk(path.join(absPath, name)));
        }
        return node;
      };

      // If requested path is project root, name should be project root folder name
      const tree = walk(abs);
      res.json(tree);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/file?path=app/models.py — отдаёт содержимое
  app.get("/api/projects/:id/file", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const rootDir = await getProjectRootDir(projectId);
      const { rel } = sanitizeAndResolve(rootDir, req.query.path as string | undefined);

      const content = await readFileFromRoot(rootDir, rel);
      res.json({ path: rel.replace(/\\/g, "/"), content });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/static-check — статический анализ без запуска кода
  app.get("/api/projects/:id/static-check", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const rootDir = await getProjectRootDir(projectId);
      const result = await runStaticCheck(rootDir);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/report — последний отчёт студента { checks, feedback }
  app.get("/api/projects/:id/report", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.lastSubmissionId) return res.status(404).json({ message: "Project has no submission" });

      const submission = await submissionStore.get(project.lastSubmissionId);
      if (!submission) return res.status(404).json({ message: "Submission not found" });

      const readyRuns = (submission.runs ?? [])
        .filter(r => r.status === "ready")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const latest = readyRuns[0];
      if (!latest) return res.status(404).json({ message: "No report available yet" });

      const runArtifactsDir = path.join(config.artifactsDir, latest.id);
      const checksPath = path.join(runArtifactsDir, "checks.json");
      const feedbackPath = path.join(runArtifactsDir, "feedback.json");

      if (!fs.existsSync(checksPath) || !fs.existsSync(feedbackPath)) {
        return res.status(404).json({ message: "Artifacts not found for the latest run" });
      }

      const checks = JSON.parse(fs.readFileSync(checksPath, "utf-8"));
      const feedback = JSON.parse(fs.readFileSync(feedbackPath, "utf-8"));

      return res.json({
        checks: checks.staticCheck,
        feedback,
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/reviewer-report — отчёт ревьюера { checks, feedback, byFile }
  app.get("/api/projects/:id/reviewer-report", async (req, res, next) => {
    try {
      const projectId = req.params.id;
      const project = await projectStore.get(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.lastSubmissionId) return res.status(404).json({ message: "Project has no submission" });

      const submission = await submissionStore.get(project.lastSubmissionId);
      if (!submission) return res.status(404).json({ message: "Submission not found" });

      const readyRuns = (submission.runs ?? [])
        .filter(r => r.status === "ready")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const latest = readyRuns[0];
      if (!latest) return res.status(404).json({ message: "No report available yet" });

      const runArtifactsDir = path.join(config.artifactsDir, latest.id);
      const checksPath = path.join(runArtifactsDir, "checks.json");
      const feedbackPath = path.join(runArtifactsDir, "feedback.json");

      if (!fs.existsSync(checksPath) || !fs.existsSync(feedbackPath)) {
        return res.status(404).json({ message: "Artifacts not found for the latest run" });
      }

      const checks = JSON.parse(fs.readFileSync(checksPath, "utf-8"));
      const feedback = JSON.parse(fs.readFileSync(feedbackPath, "utf-8"));

      // byFile из lint ошибок
      const workRoot = path.resolve(config.workDir, projectId, submission.id);
      const byFile: Record<string, Array<{ line: number; code: string; message: string }>> = {};
      for (const err of checks.staticCheck?.lint?.errors ?? []) {
        const rel = path.relative(workRoot, err.file).replace(/\\/g, "/");
        if (!byFile[rel]) byFile[rel] = [];
        byFile[rel].push({ line: err.line, code: err.code, message: err.message });
      }

      return res.json({
        checks: checks.staticCheck,
        feedback,
        byFile,
      });
    } catch (err) {
      next(err);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
