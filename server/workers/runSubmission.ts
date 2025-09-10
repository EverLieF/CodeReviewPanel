import fs from "fs";
import path from "path";
import { JsonStore } from "../store/db";
import { config } from "../config";
import { extractZipToRunDir, buildFileTree } from "../services/archive";
import { collectChecks } from "../services/collect";
import { generateMockFeedback } from "../llm/mock";
import { generateStudentReport, classifyReport, runLLMReportAndVerdict } from "../llm/pipeline";
import { extractIssuesFromReport } from "../llm/reportParser";
import { errorHandler } from "../services/error-handler";
import * as fsp from "node:fs/promises";
import type { Submission, SubmissionRun, Report } from "@shared/types";

async function ensureDir(dirPath: string): Promise<void> {
  await fs.promises.mkdir(dirPath, { recursive: true }).catch(() => {});
}

function writeJsonFileSync(filePath: string, data: unknown): void {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

function detectProject(rootDir: string): { languages: string[]; hasPytest: boolean } {
  const languages = new Set<string>();
  let hasPytest = false;
  const stack: string[] = [rootDir];
  while (stack.length) {
    const cur = stack.pop() as string;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "__pycache__") continue;
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(abs);
      else if (e.isFile()) {
        const low = e.name.toLowerCase();
        if (low.endsWith(".py")) languages.add("python");
        if (low.endsWith(".ts") || low.endsWith(".tsx")) languages.add("typescript");
        if (low.endsWith(".js") || low.endsWith(".jsx")) languages.add("javascript");
        if (/^test_.*\.py$/.test(low) || low.endsWith("_test.py") || low.endsWith("pytest.ini")) hasPytest = true;
      }
    }
  }
  return { languages: Array.from(languages), hasPytest };
}

export async function runSubmissionOrchestrator(params: { projectId: string; submissionId: string; runId: string }): Promise<{
  studentReportId: string;
  reviewerReportId: string;
}> {
  const submissionStore = new JsonStore<Submission>("submissions");
  const reportStore = new JsonStore<Report>("artifacts");

  try {
    const submission = await submissionStore.get(params.submissionId);
    if (!submission || !submission.artifactPath) {
      throw new Error("Submission or artifact not found");
    }

    const runArtifactsDir = path.join(config.artifactsDir, params.runId);
    await ensureDir(runArtifactsDir);

    let workRoot: string;
    try {
      // 1) Распаковка
      workRoot = await extractZipToRunDir(submission.artifactPath, params.projectId, params.submissionId);
    } catch (error) {
      throw new Error(`Failed to extract archive: ${error instanceof Error ? error.message : String(error)}`);
    }

    let detection: { languages: string[]; hasPytest: boolean };
    try {
      // 2) Детектор
      detection = detectProject(workRoot);
      writeJsonFileSync(path.join(runArtifactsDir, "detection.json"), detection);
    } catch (error) {
      throw new Error(`Failed to detect project: ${error instanceof Error ? error.message : String(error)}`);
    }

    let checks: any;
    try {
      // 3) Статические проверки (+pytest если ENABLE_PYTEST=true)
      checks = await collectChecks(params.runId, workRoot);
      // checks.json уже сохранён collectChecks
    } catch (error) {
      throw new Error(`Failed to collect checks: ${error instanceof Error ? error.message : String(error)}`);
    }

    let feedback: any;
    try {
      // 4) Mock feedback
      feedback = generateMockFeedback(checks.staticCheck);
      writeJsonFileSync(path.join(runArtifactsDir, "feedback.json"), feedback);
    } catch (error) {
      throw new Error(`Failed to generate feedback: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (config.enableLlm) {
      try {
        // Собираем снапшот проекта для LLM
        // 3.1. Строка дерева
        const treeNode = await buildFileTree(workRoot);
        function renderTree(n: any, prefix = ""): string {
          const here = `${prefix}${n.name}`;
          if (!n.children || n.children.length === 0) return here;
          const lines = [here];
          for (const c of n.children) lines.push(renderTree(c, prefix + "  "));
          return lines.join("\n");
        }
        const tree = renderTree(treeNode);

        // 3.2. Содержимое файлов (ограничим размер, чтобы не раздувать prompt)
        const files: Array<{ path: string; content: string }> = [];
        const MAX_FILE_SIZE = 200 * 1024; // 200 KB
        const collect = async (node: any, rel = "") => {
          if (node.isDir && node.children) {
            for (const c of node.children) await collect(c, node.path);
          } else if (!node.isDir) {
            try {
              const abs = path.join(workRoot, node.path);
              let content = await fsp.readFile(abs, "utf8");
              if (content.length > MAX_FILE_SIZE) content = content.slice(0, MAX_FILE_SIZE) + "\n/* ...truncated... */";
              files.push({ path: node.path.replace(/\\/g, "/"), content });
            } catch {}
          }
        };
        await collect(treeNode);

        // 3.3. Запуск пайплайна (отчёт → классификатор) + сохранение артефактов и llm_issues.json
        await runLLMReportAndVerdict(params.runId, { tree, files });
      } catch (e) {
        // Не валим весь прогон — просто лог и идём дальше
        console.warn("[LLM] pipeline failed:", e);
      }
    }

    try {
      // 5) Формирование отчётов
      const hasProblems = (checks.staticCheck.tests.failed ?? 0) > 0 || (checks.staticCheck.lint.errors?.length ?? 0) > 0;

      const studentReport: Report = {
        id: params.runId + ":student",
        runId: params.runId,
        createdAt: new Date().toISOString(),
        summary: feedback.summary,
        details: { kind: "student", feedback },
        status: hasProblems ? "warning" : "success",
      };

      // Группировка проблем по файлам для ревьюера
      const lintByFile: Record<string, Array<{ line: number; code: string; message: string }>> = {};
      for (const err of checks.staticCheck.lint.errors) {
        const rel = path.relative(workRoot, err.file).replace(/\\/g, "/");
        if (!lintByFile[rel]) lintByFile[rel] = [];
        lintByFile[rel].push({ line: err.line, code: err.code, message: err.message });
      }
      const reviewerDetails = {
        kind: "reviewer",
        tests: {
          passed: checks.staticCheck.tests.passed,
          failed: checks.staticCheck.tests.failed,
          failedItems: checks.staticCheck.tests.items,
        },
        lint: { byFile: lintByFile },
        metrics: checks.staticCheck.metrics,
        requirements: checks.staticCheck.requirements,
      };
      const reviewerReport: Report = {
        id: params.runId + ":reviewer",
        runId: params.runId,
        createdAt: new Date().toISOString(),
        summary: hasProblems ? "Есть проблемы, требуется внимание ревьюера" : "Проблем не найдено",
        details: reviewerDetails,
        status: hasProblems ? "error" : "success",
      };

      await reportStore.upsertMany([studentReport, reviewerReport]);


      // Вернуть идентификаторы, чтобы вызывающий код мог обновить SubmissionRun
      return { studentReportId: studentReport.id, reviewerReportId: reviewerReport.id };
    } catch (error) {
      throw new Error(`Failed to create reports: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    // Если произошла ошибка, создаём отчёт об ошибке
    await errorHandler.handleRunError(error, {
      projectId: params.projectId,
      submissionId: params.submissionId,
      runId: params.runId,
      operation: "runSubmissionOrchestrator"
    });
    
    // Перебрасываем ошибку для обработки в queue.ts
    throw error;
  }
}


