import { yandexCompletion } from "./yandex";
import { getReportSystemPromptFromHtml, getClassifierSystemPromptFromHtml } from "./htmlPromptLoader";
import { extractIssuesFromReport } from "./reportParser";

/**
 * Генерирует отчет для студента с использованием LLM
 */
export async function generateStudentReport(userReport: string): Promise<string> {
  const reportSystem = await getReportSystemPromptFromHtml();
  
  const reportResp = await yandexCompletion(
    [
      { role: "system", text: reportSystem },
      { role: "user", text: userReport }
    ],
    { temperature: 0.1, maxTokens: 3000 }
  );
  
  return reportResp.text;
}

/**
 * Классифицирует отчет с использованием LLM
 */
export async function classifyReport(reportText: string): Promise<string> {
  const classifierSystem = await getClassifierSystemPromptFromHtml();
  
  const verdictResp = await yandexCompletion(
    [
      { role: "system", text: classifierSystem },
      { role: "user", text: reportText }
    ],
    { temperature: 0.0, maxTokens: 20 }
  );
  
  return verdictResp.text;
}
