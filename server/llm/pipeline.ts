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

/**
 * Запускает полный пайплайн LLM: генерация отчета и классификация
 */
export async function runLLMReportAndVerdict(runId: string, projectSnapshot: { tree: string; files: Array<{ path: string; content: string }> }): Promise<void> {
  try {
    // Создаем контекст для LLM из снапшота проекта
    const projectContext = `
Структура проекта:
${projectSnapshot.tree}

Содержимое файлов:
${projectSnapshot.files.map(f => `\n=== ${f.path} ===\n${f.content}`).join('\n')}
`;

    // Генерируем отчет
    const report = await generateStudentReport(projectContext);
    
    // Классифицируем отчет
    const verdict = await classifyReport(report);
    
    // Извлекаем проблемы из отчета
    const issues = await extractIssuesFromReport(runId, report, projectSnapshot.files);
    
    // Сохраняем результаты
    const fs = await import("fs");
    const path = await import("path");
    const { config } = await import("../config");
    
    const runArtifactsDir = path.join(config.artifactsDir, runId);
    await fs.promises.mkdir(runArtifactsDir, { recursive: true });
    
    const llmResults = {
      report,
      verdict,
      issues,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile(
      path.join(runArtifactsDir, "llm_results.json"),
      JSON.stringify(llmResults, null, 2)
    );
    
  } catch (error) {
    console.error("LLM pipeline error:", error);
    throw error;
  }
}
