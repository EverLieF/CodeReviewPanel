import { randomUUID } from "crypto";
import { JsonStore } from "./store/db";
import type { Submission, SubmissionRun } from "@shared/types";
import { runSubmissionOrchestrator } from "./workers/runSubmission";
import { timelineService } from "./services/timeline";
import { errorHandler } from "./services/error-handler";

type QueueTask = {
  runId: string;
  projectId: string;
  submissionId: string;
  toolchain: string;
  enqueuedAt: number;
};

class InMemoryQueue {
  private tasks: QueueTask[] = [];
  private readonly submissionStore = new JsonStore<Submission>("submissions");
  private timer: NodeJS.Timer | null = null;
  private readonly intervalMs = 100; // worker tick

  constructor() {
    this.start();
  }

  private start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  enqueue(submissionId: string, toolchain: string, projectId?: string): { runId: string; status: "queued" } {
    const runId = randomUUID();
    const task: QueueTask = {
      runId,
      projectId: projectId || "",
      submissionId,
      toolchain,
      enqueuedAt: Date.now(),
    };
    this.tasks.push(task);
    // Запишем в Submission ран с состоянием queued
    void this.markQueued(task).catch(() => {});
    return { runId, status: "queued" };
  }

  private async markQueued(task: QueueTask): Promise<void> {
    const submission = await this.submissionStore.get(task.submissionId);
    if (!submission) return;
    const now = new Date().toISOString();
    const run: SubmissionRun = {
      id: task.runId,
      submissionId: task.submissionId,
      createdAt: now,
      toolchain: task.toolchain,
      status: "queued",
    };
    await this.submissionStore.update(submission.id, (s) => ({
      ...s,
      runs: [...(s.runs ?? []), run],
    }));
  }

  private async tick(): Promise<void> {
    const task = this.tasks.shift();
    if (!task) return;
    await this.runTask(task);
  }

  private async runTask(task: QueueTask): Promise<void> {
    const submission = await this.submissionStore.get(task.submissionId);
    if (!submission) return;

    const start = Date.now();
    // Переводим queued -> running
    await this.submissionStore.update(submission.id, (s) => ({
      ...s,
      runs: (s.runs ?? []).map((r) => (r.id === task.runId ? { ...r, status: "running" } : r)),
    }));

    try {
      const { reviewerReportId } = await runSubmissionOrchestrator({
        projectId: task.projectId,
        submissionId: task.submissionId,
        runId: task.runId,
      });

      const durationMs = Date.now() - start;
      await this.submissionStore.update(submission.id, (s) => ({
        ...s,
        runs: (s.runs ?? []).map((r) => (r.id === task.runId ? { ...r, status: "ready", durationMs, reportId: reviewerReportId } : r)),
      }));

      // Логируем событие завершения проверки
      await timelineService.addEvent("run_finished", {
        projectId: task.projectId,
        submissionId: task.submissionId,
        runId: task.runId,
        message: `Проверка "${task.toolchain}" завершена успешно`,
        details: { toolchain: task.toolchain, durationMs, status: "ready" }
      });

      // Логируем готовность проверок
      await timelineService.addEvent("checks_ready", {
        projectId: task.projectId,
        submissionId: task.submissionId,
        runId: task.runId,
        message: `Результаты проверки "${task.toolchain}" готовы`,
        details: { toolchain: task.toolchain }
      });

      // Логируем готовность обратной связи
      await timelineService.addEvent("feedback_ready", {
        projectId: task.projectId,
        submissionId: task.submissionId,
        runId: task.runId,
        message: `Обратная связь по проверке "${task.toolchain}" готова`,
        details: { toolchain: task.toolchain }
      });
    } catch (e) {
      const durationMs = Date.now() - start;
      
      // Используем единый обработчик ошибок
      await errorHandler.handleRunError(e, {
        projectId: task.projectId,
        submissionId: task.submissionId,
        runId: task.runId,
        toolchain: task.toolchain,
        operation: "runSubmissionOrchestrator",
        durationMs
      });
    }
  }
}

export const queue = new InMemoryQueue();

export function runSubmission(params: { projectId: string; submissionId: string; runId?: string; toolchain?: string }): { runId: string; status: "queued" } {
  const toolchain = params.toolchain || "tests";
  const { runId, status } = queue.enqueue(params.submissionId, toolchain, params.projectId);
  return { runId, status };
}


