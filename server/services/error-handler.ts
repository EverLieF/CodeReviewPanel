import { JsonStore } from "../store/db";
import { timelineService } from "./timeline";
import type { Submission, Report } from "@shared/types";
import path from "path";
import fs from "fs";
import { config } from "../config";

export interface ErrorContext {
  projectId?: string;
  submissionId?: string;
  runId?: string;
  toolchain?: string;
  operation?: string;
  durationMs?: number;
}

export interface ErrorInfo {
  type: string;
  message: string;
  userMessage: string;
  suggestion: string;
  technical?: string;
}

// Классификация ошибок и их пользовательские сообщения
const ERROR_TYPES: Record<string, ErrorInfo> = {
  // Ошибки файловой системы
  "FILE_NOT_FOUND": {
    type: "FILE_NOT_FOUND",
    message: "Файл или директория не найдены",
    userMessage: "Не удалось найти необходимые файлы проекта",
    suggestion: "Проверьте, что архив содержит все необходимые файлы и не повреждён"
  },
  "PERMISSION_DENIED": {
    type: "PERMISSION_DENIED", 
    message: "Недостаточно прав доступа",
    userMessage: "Не удалось получить доступ к файлам проекта",
    suggestion: "Проверьте права доступа к файлам или попробуйте загрузить проект заново"
  },
  "DISK_FULL": {
    type: "DISK_FULL",
    message: "Недостаточно места на диске",
    userMessage: "Недостаточно места для обработки проекта",
    suggestion: "Освободите место на диске или обратитесь к администратору"
  },

  // Ошибки архива
  "INVALID_ARCHIVE": {
    type: "INVALID_ARCHIVE",
    message: "Некорректный формат архива",
    userMessage: "Загруженный файл не является корректным архивом",
    suggestion: "Убедитесь, что файл имеет формат ZIP и не повреждён"
  },
  "ARCHIVE_TOO_LARGE": {
    type: "ARCHIVE_TOO_LARGE",
    message: "Архив слишком большой",
    userMessage: "Размер архива превышает допустимый лимит",
    suggestion: "Уменьшите размер архива или удалите ненужные файлы"
  },
  "EXTRACT_FAILED": {
    type: "EXTRACT_FAILED",
    message: "Ошибка распаковки архива",
    userMessage: "Не удалось распаковать архив проекта",
    suggestion: "Проверьте целостность архива или попробуйте создать новый"
  },

  // Ошибки выполнения
  "EXECUTION_TIMEOUT": {
    type: "EXECUTION_TIMEOUT",
    message: "Превышено время выполнения",
    userMessage: "Проверка заняла слишком много времени",
    suggestion: "Попробуйте упростить код или разбить проект на части"
  },
  "EXECUTION_FAILED": {
    type: "EXECUTION_FAILED",
    message: "Ошибка выполнения команды",
    userMessage: "Не удалось выполнить проверку кода",
    suggestion: "Проверьте синтаксис кода и наличие всех зависимостей"
  },
  "PYTEST_ERROR": {
    type: "PYTEST_ERROR",
    message: "Ошибка выполнения тестов",
    userMessage: "Не удалось запустить тесты",
    suggestion: "Проверьте корректность тестов и установку pytest"
  },

  // Ошибки конфигурации
  "MISSING_CONFIG": {
    type: "MISSING_CONFIG",
    message: "Отсутствует конфигурационный файл",
    userMessage: "Не найден файл конфигурации проекта",
    suggestion: "Добавьте необходимые конфигурационные файлы (requirements.txt, pytest.ini и т.д.)"
  },
  "INVALID_CONFIG": {
    type: "INVALID_CONFIG",
    message: "Некорректная конфигурация",
    userMessage: "Конфигурация проекта содержит ошибки",
    suggestion: "Проверьте формат и содержимое конфигурационных файлов"
  },

  // Ошибки сети
  "NETWORK_ERROR": {
    type: "NETWORK_ERROR",
    message: "Ошибка сетевого соединения",
    userMessage: "Не удалось загрузить проект из интернета",
    suggestion: "Проверьте подключение к интернету и доступность репозитория"
  },
  "DOWNLOAD_FAILED": {
    type: "DOWNLOAD_FAILED",
    message: "Ошибка загрузки",
    userMessage: "Не удалось загрузить проект",
    suggestion: "Проверьте ссылку на репозиторий и попробуйте позже"
  },

  // Ошибки данных
  "INVALID_DATA": {
    type: "INVALID_DATA",
    message: "Некорректные данные",
    userMessage: "Получены некорректные данные",
    suggestion: "Проверьте формат загружаемых данных"
  },
  "DATA_CORRUPTION": {
    type: "DATA_CORRUPTION",
    message: "Повреждение данных",
    userMessage: "Данные проекта повреждены",
    suggestion: "Попробуйте загрузить проект заново"
  },

  // Общие ошибки
  "UNKNOWN_ERROR": {
    type: "UNKNOWN_ERROR",
    message: "Неизвестная ошибка",
    userMessage: "Произошла неожиданная ошибка",
    suggestion: "Попробуйте повторить операцию или обратитесь к администратору"
  },
  "SYSTEM_ERROR": {
    type: "SYSTEM_ERROR",
    message: "Системная ошибка",
    userMessage: "Временная проблема с системой",
    suggestion: "Попробуйте позже или обратитесь к администратору"
  }
};

export class ErrorHandler {
  private submissionStore = new JsonStore<Submission>("submissions");

  /**
   * Классифицирует ошибку и возвращает информацию для пользователя
   */
  classifyError(error: Error | unknown): ErrorInfo {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const errorStack = error instanceof Error ? error.stack?.toLowerCase() : "";

    // Проверяем конкретные типы ошибок
    if (errorMessage.includes("enoent") || errorMessage.includes("not found")) {
      return ERROR_TYPES.FILE_NOT_FOUND;
    }
    if (errorMessage.includes("eacces") || errorMessage.includes("permission denied")) {
      return ERROR_TYPES.PERMISSION_DENIED;
    }
    if (errorMessage.includes("enospc") || errorMessage.includes("no space")) {
      return ERROR_TYPES.DISK_FULL;
    }
    if (errorMessage.includes("invalid archive") || errorMessage.includes("bad zip")) {
      return ERROR_TYPES.INVALID_ARCHIVE;
    }
    if (errorMessage.includes("too large") || errorMessage.includes("file too big")) {
      return ERROR_TYPES.ARCHIVE_TOO_LARGE;
    }
    if (errorMessage.includes("extract") || errorMessage.includes("unzip")) {
      return ERROR_TYPES.EXTRACT_FAILED;
    }
    if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
      return ERROR_TYPES.EXECUTION_TIMEOUT;
    }
    if (errorMessage.includes("pytest") || errorMessage.includes("test")) {
      return ERROR_TYPES.PYTEST_ERROR;
    }
    if (errorMessage.includes("config") || errorMessage.includes("configuration")) {
      return ERROR_TYPES.MISSING_CONFIG;
    }
    if (errorMessage.includes("network") || errorMessage.includes("connection")) {
      return ERROR_TYPES.NETWORK_ERROR;
    }
    if (errorMessage.includes("download") || errorMessage.includes("fetch")) {
      return ERROR_TYPES.DOWNLOAD_FAILED;
    }

    // Проверяем по коду ошибки
    if (error instanceof Error && 'code' in error) {
      const code = (error as any).code;
      if (code === 'ENOENT') return ERROR_TYPES.FILE_NOT_FOUND;
      if (code === 'EACCES') return ERROR_TYPES.PERMISSION_DENIED;
      if (code === 'ENOSPC') return ERROR_TYPES.DISK_FULL;
    }

    // По умолчанию возвращаем общую ошибку
    return ERROR_TYPES.UNKNOWN_ERROR;
  }

  /**
   * Обрабатывает ошибку в контексте выполнения run
   */
  async handleRunError(
    error: Error | unknown,
    context: ErrorContext
  ): Promise<void> {
    const errorInfo = this.classifyError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Обновляем статус run на "errors"
    if (context.submissionId && context.runId) {
      await this.submissionStore.update(context.submissionId, (submission) => ({
        ...submission,
        runs: (submission.runs ?? []).map((run) =>
          run.id === context.runId
            ? { ...run, status: "errors", durationMs: context.durationMs }
            : run
        ),
      }));
    }

    // Создаём отчёт об ошибке для студента
    if (context.runId) {
      await this.createErrorReport(context.runId, errorInfo, context);
    }

    // Логируем событие в таймлайн
    await timelineService.addEvent("error", {
      projectId: context.projectId,
      submissionId: context.submissionId,
      runId: context.runId,
      message: `Ошибка при выполнении ${context.operation || "проверки"}: ${errorInfo.userMessage}`,
      details: {
        errorType: errorInfo.type,
        technicalMessage: errorMessage,
        toolchain: context.toolchain,
        durationMs: context.durationMs,
        suggestion: errorInfo.suggestion
      }
    });
  }

  /**
   * Создаёт отчёт об ошибке для студента
   */
  private async createErrorReport(
    runId: string,
    errorInfo: ErrorInfo,
    context: ErrorContext
  ): Promise<void> {
    const runArtifactsDir = path.join(config.artifactsDir, runId);
    await fs.promises.mkdir(runArtifactsDir, { recursive: true }).catch(() => {});

    // Создаём отчёт для студента
    const studentReport: Report = {
      id: `${runId}:student`,
      runId,
      createdAt: new Date().toISOString(),
      summary: errorInfo.userMessage,
      details: {
        kind: "student",
        error: {
          type: errorInfo.type,
          message: errorInfo.userMessage,
          suggestion: errorInfo.suggestion,
          technical: errorInfo.technical || "Детали ошибки скрыты для упрощения"
        }
      },
      status: "error"
    };

    // Создаём отчёт для ревьюера
    const reviewerReport: Report = {
      id: `${runId}:reviewer`,
      runId,
      createdAt: new Date().toISOString(),
      summary: `Ошибка выполнения: ${errorInfo.message}`,
      details: {
        kind: "reviewer",
        error: {
          type: errorInfo.type,
          message: errorInfo.message,
          technical: errorInfo.technical || errorInfo.message,
          context: {
            toolchain: context.toolchain,
            operation: context.operation,
            durationMs: context.durationMs
          }
        }
      },
      status: "error"
    };

    // Сохраняем отчёты
    const reportStore = new JsonStore<Report>("artifacts");
    await reportStore.upsertMany([studentReport, reviewerReport]);

    // Сохраняем отчёты в файлы для совместимости
    await fs.promises.writeFile(
      path.join(runArtifactsDir, "feedback.json"),
      JSON.stringify(studentReport.details, null, 2),
      "utf-8"
    ).catch(() => {});

    await fs.promises.writeFile(
      path.join(runArtifactsDir, "checks.json"),
      JSON.stringify({
        runId,
        createdAt: new Date().toISOString(),
        staticCheck: {
          tests: { passed: 0, failed: 0, items: [] },
          lint: { errors: [] },
          metrics: {},
          requirements: { missing: [], found: [] }
        },
        error: {
          type: errorInfo.type,
          message: errorInfo.message,
          technical: errorInfo.technical || errorInfo.message
        }
      }, null, 2),
      "utf-8"
    ).catch(() => {});
  }

  /**
   * Обрабатывает ошибку в контексте API запроса
   */
  async handleApiError(
    error: Error | unknown,
    context: ErrorContext
  ): Promise<{ status: number; message: string; userMessage: string; suggestion: string }> {
    const errorInfo = this.classifyError(error);

    // Логируем событие в таймлайн
    await timelineService.addEvent("error", {
      projectId: context.projectId,
      submissionId: context.submissionId,
      runId: context.runId,
      message: `API ошибка: ${errorInfo.userMessage}`,
      details: {
        errorType: errorInfo.type,
        operation: context.operation,
        technicalMessage: error instanceof Error ? error.message : String(error)
      }
    });

    // Определяем HTTP статус код
    let status = 500;
    if (errorInfo.type === "FILE_NOT_FOUND") status = 404;
    if (errorInfo.type === "PERMISSION_DENIED") status = 403;
    if (errorInfo.type === "INVALID_ARCHIVE" || errorInfo.type === "INVALID_DATA") status = 400;
    if (errorInfo.type === "ARCHIVE_TOO_LARGE") status = 413;

    return {
      status,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage,
      suggestion: errorInfo.suggestion
    };
  }
}

export const errorHandler = new ErrorHandler();

