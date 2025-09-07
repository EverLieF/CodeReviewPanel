/**
 * HTTP-клиент для работы с API
 * Универсальная функция запросов с поддержкой типизации
 */

export interface HttpError extends Error {
  status: number;
  url: string;
  message: string;
  details?: unknown;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Создает строку запроса из объекта параметров
 */
function buildQueryString(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Универсальная функция для выполнения HTTP-запросов
 */
export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  opts: RequestOptions = {}
): Promise<T> {
  const { query, body, headers = {}, timeoutMs = 15000 } = opts;
  
  // Строим полный URL
  const queryString = query ? buildQueryString(query) : '';
  const fullUrl = `${baseURL}${url}${queryString}`;
  
  // Настраиваем заголовки
  const requestHeaders: Record<string, string> = { ...headers };
  
  // Подготавливаем тело запроса
  let requestBody: string | FormData | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      requestBody = body;
      // Не устанавливаем Content-Type для FormData - браузер сделает это автоматически
    } else {
      requestBody = JSON.stringify(body);
      requestHeaders['Content-Type'] = 'application/json';
    }
  }
  
  // Создаем AbortController для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error: HttpError = {
        name: 'HttpError',
        status: response.status,
        url: fullUrl,
        message: `HTTP ${response.status}: ${response.statusText}`,
        details: undefined,
      };
      
      // Пытаемся получить детали ошибки из ответа
      try {
        const errorData = await response.json();
        error.details = errorData;
        error.message = errorData.message || error.message;
      } catch {
        // Если не удалось распарсить JSON, используем текст ответа
        try {
          const errorText = await response.text();
          error.details = errorText;
        } catch {
          // Игнорируем ошибки парсинга
        }
      }
      
      throw error;
    }
    
    // Парсим JSON ответ
    return await response.json() as T;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Обрабатываем ошибки AbortController (таймаут)
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError: HttpError = {
        name: 'HttpError',
        status: 408,
        url: fullUrl,
        message: `Request timeout after ${timeoutMs}ms`,
        details: undefined,
      };
      throw timeoutError;
    }
    
    // Пробрасываем HTTP ошибки как есть
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }
    
    // Обрабатываем другие ошибки (сеть, парсинг и т.д.)
    const networkError: HttpError = {
      name: 'HttpError',
      status: 0,
      url: fullUrl,
      message: error instanceof Error ? error.message : 'Network error',
      details: error,
    };
    throw networkError;
  }
}

/**
 * Вспомогательные функции для различных HTTP-методов
 */
export const get = <T>(url: string, opts?: Omit<RequestOptions, 'body'>): Promise<T> =>
  request<T>('GET', url, opts);

export const post = <T>(url: string, opts?: RequestOptions): Promise<T> =>
  request<T>('POST', url, opts);

export const put = <T>(url: string, opts?: RequestOptions): Promise<T> =>
  request<T>('PUT', url, opts);

export const del = <T>(url: string, opts?: Omit<RequestOptions, 'body'>): Promise<T> =>
  request<T>('DELETE', url, opts);

/**
 * Преобразует ошибку в понятное пользователю сообщение
 */
export function toHumanError(error: unknown): string {
  // Если это HttpError с деталями
  if (error && typeof error === 'object' && 'status' in error) {
    const httpError = error as HttpError;
    
    // Ошибки 400-499: клиентские ошибки
    if (httpError.status >= 400 && httpError.status < 500) {
      // Пытаемся извлечь сообщение из деталей ошибки
      if (httpError.details && typeof httpError.details === 'object') {
        const details = httpError.details as Record<string, unknown>;
        if (typeof details.message === 'string') {
          return details.message;
        }
      }
      // Если есть сообщение в самой ошибке и оно не стандартное
      if (httpError.message && !httpError.message.startsWith('HTTP ')) {
        return httpError.message;
      }
      return 'Ошибка запроса';
    }
    
    // Ошибки 500+: серверные ошибки
    if (httpError.status >= 500) {
      return 'Сервер временно недоступен';
    }
    
    // Таймаут
    if (httpError.status === 408) {
      return 'Превышено время ожидания запроса';
    }
    
    // Сетевые ошибки (статус 0)
    if (httpError.status === 0) {
      return 'Ошибка сети. Проверьте подключение к интернету';
    }
  }
  
  // Если это обычная Error
  if (error instanceof Error) {
    return error.message;
  }
  
  // Если это строка
  if (typeof error === 'string') {
    return error;
  }
  
  // Для неизвестных ошибок
  return 'Произошла неизвестная ошибка';
}
