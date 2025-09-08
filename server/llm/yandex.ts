import { StaticCheckResult } from "../services/staticCheck";
import { generateMockFeedback, type FeedbackJSON } from "./mock";

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
