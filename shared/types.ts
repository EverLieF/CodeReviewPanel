// Общие типы доменной модели, доступные как на клиенте, так и на сервере

export type UUID = string;

export interface Comment {
  id: UUID;
  submissionId: UUID;
  author: string;
  createdAt: string; // ISO
  line?: number;
  text: string;
  status?: "needs-fix" | "suggestion" | "resolved";
}

export interface Report {
  id: UUID;
  runId: UUID;
  createdAt: string; // ISO
  summary: string;
  details?: unknown;
  status: "success" | "warning" | "error";
}

export interface SubmissionRun {
  id: UUID;
  submissionId: UUID;
  createdAt: string; // ISO
  toolchain: string; // напр. "eslint", "tests", "build"
  status: "queued" | "running" | "passed" | "failed" | "ready" | "errors";
  durationMs?: number;
  reportId?: UUID;
}

export interface Submission {
  id: UUID;
  projectId: UUID;
  createdAt: string; // ISO
  author: string;
  message?: string;
  artifactPath?: string; // путь к загруженному архиву/каталогу
  runs?: SubmissionRun[];
  reportId?: UUID; // итоговый отчёт по сабмишену
}

export interface Project {
  id: UUID;
  name: string;
  description?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  status: "ready" | "in-progress" | "errors";
  lastSubmissionId?: UUID;
}

export interface TimelineEvent {
  id: UUID;
  type: "uploaded" | "run_started" | "checks_ready" | "feedback_ready" | "run_finished" | "error" | "deleted";
  projectId?: UUID;
  submissionId?: UUID;
  runId?: UUID;
  message?: string;
  details?: unknown;
  createdAt: string; // ISO
}


