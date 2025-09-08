/**
 * API-клиент для работы с бэкендом
 * Типобезопасные обёртки для HTTP-запросов
 */

import { get, post, put, del } from './http';
import type { Project, ReviewComment, TimelineEvent, CodeFile, FileNode, ProjectRun, TimelineEventData } from './types';

// Типы для входных параметров API
export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface AddCommentInput {
  text: string;
  file?: string;
  line?: number;
  severity?: string;
}

export interface UpdateCommentStatusInput {
  status: 'needs-fix' | 'suggestion' | 'resolved';
}

export interface UploadRepoUrlInput {
  repoUrl: string;
}

/**
 * Получить список всех проектов
 */
export async function getProjects(): Promise<Project[]> {
  return get<Project[]>('/projects');
}

/**
 * Получить конкретный проект по ID
 */
export async function getProject(projectId: string): Promise<Project> {
  return get<Project>(`/projects/${projectId}`);
}

/**
 * Создать новый проект
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  return post<Project>('/projects', { body: input });
}

/**
 * Загрузить проект с файлами (ZIP)
 */
export interface UploadProjectResponse {
  projectId: string;
  submissionId: string;
  name: string;
  filesCount: number;
}

export async function uploadZip(form: FormData): Promise<UploadProjectResponse> {
  return post<UploadProjectResponse>('/projects/upload', { body: form });
}

/**
 * Загрузить проект из GitHub репозитория
 */
export async function uploadRepoUrl(input: UploadRepoUrlInput): Promise<UploadProjectResponse> {
  return post<UploadProjectResponse>('/projects/upload', { 
    body: input,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Оставляем старую функцию для обратной совместимости
export async function uploadProject(form: FormData): Promise<UploadProjectResponse> {
  return uploadZip(form);
}

// Запустить прогон проверки последнего сабмишена проекта
export interface RunSubmissionResponse {
  runId: string;
  status: 'queued';
}

export async function startRun(projectId: string, toolchain?: string): Promise<RunSubmissionResponse> {
  const body = toolchain ? { toolchain } : undefined;
  return post<RunSubmissionResponse>(`/projects/${projectId}/run`, { body });
}

// Получить статус прогона
export interface RunStatusResponse {
  runId: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'ready' | 'errors';
  durationMs?: number;
  reportId?: string;
}

export async function getRunStatus(projectId: string, runId: string): Promise<RunStatusResponse> {
  return get<RunStatusResponse>(`/projects/${projectId}/run/${runId}/status`);
}

// Оставляем старую функцию для обратной совместимости
export async function runProjectChecks(projectId: string, toolchain?: string): Promise<RunSubmissionResponse> {
  return startRun(projectId, toolchain);
}

/**
 * Получить комментарии для проекта
 */
export async function getComments(projectId: string): Promise<ReviewComment[]> {
  return get<ReviewComment[]>(`/projects/${projectId}/comments`);
}

/**
 * Добавить комментарий к проекту
 */
export async function addComment(
  projectId: string, 
  input: AddCommentInput
): Promise<ReviewComment> {
  return post<ReviewComment>(`/projects/${projectId}/comments`, { body: input });
}

/**
 * Обновить комментарий
 */
export async function updateComment(
  projectId: string,
  commentId: string,
  input: Partial<AddCommentInput>
): Promise<ReviewComment> {
  return put<ReviewComment>(`/projects/${projectId}/comments/${commentId}`, { 
    body: input 
  });
}

/**
 * Получить отчет студента
 */
export interface StudentReport {
  checks: any;
  feedback: any;
}

export async function getReport(projectId: string): Promise<StudentReport> {
  return get<StudentReport>(`/projects/${projectId}/report`);
}

/**
 * Получить отчет ревьюера
 */
export interface ReviewerReport {
  checks: any;
  feedback: any;
  byFile: Record<string, Array<{ line: number; code: string; message: string }>>;
}

export async function getReviewerReport(projectId: string): Promise<ReviewerReport> {
  return get<ReviewerReport>(`/projects/${projectId}/reviewer-report`);
}

/**
 * Получить timeline события для истории
 */
export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  return get<TimelineEvent[]>('/timeline');
}

/**
 * Получить timeline события (алиас для getTimelineEvents)
 */
export async function getTimeline(): Promise<TimelineEvent[]> {
  return getTimelineEvents();
}

/**
 * Получить timeline события в формате сервера
 */
export async function getTimelineEventsData(): Promise<TimelineEventData[]> {
  return get<TimelineEventData[]>('/timeline');
}

/**
 * Получить прогоны для конкретного проекта
 */
export async function getProjectRuns(projectId: string): Promise<ProjectRun> {
  return get<ProjectRun>(`/projects/${projectId}/runs`);
}

/**
 * Получить все прогоны всех проектов
 */
export async function getAllRuns(): Promise<ProjectRun[]> {
  return get<ProjectRun[]>('/runs');
}

/**
 * Получить файл кода для просмотра
 */
type ServerTreeNode = { name: string; path: string; isDir: boolean; children?: ServerTreeNode[] };
type ServerFileResponse = { path: string; content: string };

function mapServerNodeToClient(node: ServerTreeNode): FileNode {
  return {
    name: node.name || '/',
    type: node.isDir ? 'folder' : 'file',
    children: node.children?.map(mapServerNodeToClient),
  };
}

export async function getFileTree(projectId: string, path: string = '/'): Promise<FileNode[]> {
  const root = await get<ServerTreeNode>(`/projects/${projectId}/files?path=${encodeURIComponent(path)}`);
  // Возвращаем детей корня, чтобы список был массивом FileNode
  const nodes = (root.children ?? []).map(mapServerNodeToClient);
  return nodes;
}

export async function getFile(projectId: string, filePath: string): Promise<CodeFile> {
  const resp = await get<ServerFileResponse>(`/projects/${projectId}/file?path=${encodeURIComponent(filePath)}`);
  const lines = resp.content.split('\n');
  return {
    path: resp.path,
    additions: 0,
    deletions: 0,
    content: lines.map((text, idx) => ({ number: idx + 1, content: text, type: 'normal' as const })),
  };
}

// Оставляем старые функции для обратной совместимости
export async function getProjectTree(projectId: string, path: string = '/'): Promise<FileNode[]> {
  return getFileTree(projectId, path);
}

export async function getCodeFile(projectId: string, filePath: string): Promise<CodeFile> {
  return getFile(projectId, filePath);
}

/**
 * Обновить статус комментария
 */
export async function updateCommentStatus(
  projectId: string,
  commentId: string,
  input: UpdateCommentStatusInput
): Promise<ReviewComment> {
  return put<ReviewComment>(`/projects/${projectId}/comments/${commentId}`, { 
    body: input 
  });
}

/**
 * Удалить комментарий
 */
export async function deleteComment(projectId: string, commentId: string): Promise<void> {
  return del<void>(`/projects/${projectId}/comments/${commentId}`);
}
