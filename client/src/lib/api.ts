/**
 * API-клиент для работы с бэкендом
 * Типобезопасные обёртки для HTTP-запросов
 */

import { get, post, put, del } from './http';
import type { Project, ReviewComment, TimelineEvent, CodeFile } from './types';

// Типы для входных параметров API
export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface AddCommentInput {
  text: string;
  file?: string;
  line?: number;
}

export interface UpdateCommentStatusInput {
  status: 'needs-fix' | 'suggestion' | 'resolved';
}

/**
 * Получить список всех проектов
 */
export async function getProjects(): Promise<Project[]> {
  return get<Project[]>('/projects');
}

/**
 * Создать новый проект
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  return post<Project>('/projects', { body: input });
}

/**
 * Загрузить проект с файлами
 */
export async function uploadProject(form: FormData): Promise<Project> {
  return post<Project>('/projects', { body: form });
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
 * Получить timeline события для истории
 */
export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  return get<TimelineEvent[]>('/timeline');
}

/**
 * Получить файл кода для просмотра
 */
export async function getCodeFile(projectId: string, filePath: string): Promise<CodeFile> {
  return get<CodeFile>(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`);
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
