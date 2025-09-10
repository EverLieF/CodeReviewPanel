import { StaticCheckResult } from "../services/staticCheck";
import { generateMockFeedback, type FeedbackJSON } from "./mock";
import { config } from "../config";

/**
 * Генерирует обратную связь с использованием Yandex GPT API
 * 
 * TODO: Реализовать реальный вызов Yandex GPT API
 * 
 * URL: https://llm.api.cloud.yandex.net/foundationModels/v1/completion
 * 
 * Headers:
 * - Authorization: Api-Key <YOUR_API_KEY>
 * - Content-Type: application/json
 * 
 * Схема запроса:
 * {
 *   "modelUri": "gpt://<folder_id>/yandexgpt",
 *   "completionOptions": {
 *     "stream": false,
 *     "temperature": 0.1,
 *     "maxTokens": 2000
 *   },
 *   "messages": [
 *     {
 *       "role": "system",
 *       "text": "Ты - опытный ревьюер кода. Проанализируй результаты проверки и дай обратную связь студенту."
 *     },
 *     {
 *       "role": "user", 
 *       "text": "Результаты проверки: ${JSON.stringify(checks)}"
 *     }
 *   ]
 * }
 * 
 * Схема ответа:
 * {
 *   "result": {
 *     "alternatives": [
 *       {
 *         "message": {
 *           "text": "JSON с обратной связью в формате FeedbackJSON"
 *         }
 *       }
 *     ]
 *   }
 * }
 */
export async function generateFeedback(checks: StaticCheckResult): Promise<FeedbackJSON> {
  // TODO: Заменить на реальный вызов Yandex GPT API
  // Пока используем mock для совместимости
  return generateMockFeedback(checks);
}

// Типы для Yandex LLM API
export type YCMessage = { role: 'system'|'user'|'assistant'; text: string };

/**
 * Выполняет запрос к Yandex LLM API для генерации текста
 */
export async function yandexCompletion(
  messages: YCMessage[], 
  opts?: { temperature?: number; maxTokens?: number; modelUri?: string }
): Promise<{ text: string; raw: any }> {
  const configYandex = config.yandex;
  
  // Если переменные окружения не установлены, используем mock режим
  if (!configYandex.apiKey || !configYandex.folderId || !configYandex.modelUri) {
    console.log('YandexGPT API ключи не установлены, используем mock режим');
    const lastMessage = messages[messages.length - 1];
    const mockText = lastMessage?.text === 'test' ? 'OK' : `Mock response for: ${lastMessage?.text || 'ping'}`;
    return { 
      text: mockText, 
      raw: { mock: true, message: mockText } 
    };
  }

  const url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Api-Key ${configYandex.apiKey}`,
    "x-folder-id": configYandex.folderId
  };

  const body = {
    modelUri: opts?.modelUri ?? configYandex.modelUri,
    completionOptions: { 
      stream: false, 
      temperature: opts?.temperature ?? 0.1, 
      maxTokens: String(opts?.maxTokens ?? 2000) 
    },
    messages
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Yandex API error: ${response.status} ${response.statusText}`);
    }

    const raw = await response.json();
    
    // Извлекаем текст из первого альтернативного сообщения
    const text = raw?.result?.alternatives?.[0]?.message?.text || '';
    
    return { text, raw };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Ошибка при обращении к Yandex LLM API: ${error.message}`);
    }
    throw new Error('Неизвестная ошибка при обращении к Yandex LLM API');
  }
}
