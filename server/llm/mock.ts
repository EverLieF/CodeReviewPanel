import { StaticCheckResult } from "../services/staticCheck";

export type FeedbackJSON = {
  summary: string;
  score: number; // 0..100
  verdict: "send_back" | "to_reviewer";
  requirements: string[];
  problems: string[];
  next_steps: string[];
};

export function generateMockFeedback(checks: StaticCheckResult): FeedbackJSON {
  const hasLintErrors = Array.isArray(checks?.lint?.errors) && checks.lint.errors.length > 0;
  const hasFailedTests = (checks?.tests?.failed ?? 0) > 0;

  const verdict: FeedbackJSON["verdict"] = hasLintErrors || hasFailedTests ? "send_back" : "to_reviewer";

  const problems: string[] = [];
  if (hasFailedTests) problems.push(`Не пройдены тесты: ${checks.tests.failed}`);
  if (hasLintErrors) problems.push(`Найдены замечания линтера: ${checks.lint.errors.length}`);

  // Простая эвристика оценки: 100 - 10 за каждый упавший тест - 1 за каждую lint-ошибку (границы 0..100)
  const rawScore = 100 - 10 * (checks?.tests?.failed ?? 0) - (checks?.lint?.errors?.length ?? 0);
  const score = Math.max(0, Math.min(100, rawScore));

  const passedReqs = checks?.requirements?.filter((r) => r.status === "passed").length ?? 0;
  const failedReqs = checks?.requirements?.filter((r) => r.status === "failed").length ?? 0;

  const summaryParts: string[] = [];
  summaryParts.push(`Оценка: ${score}/100`);
  summaryParts.push(`Тесты: passed=${checks?.tests?.passed ?? 0}, failed=${checks?.tests?.failed ?? 0}`);
  summaryParts.push(`Линт-замечаний: ${checks?.lint?.errors?.length ?? 0}`);
  summaryParts.push(`Требования: пройдено=${passedReqs}, провалено=${failedReqs}`);
  const summary = summaryParts.join("; ");

  const requirements = (checks?.requirements ?? []).map((r) => `${r.title}: ${r.status}`);

  const nextSteps: string[] = [];
  if (hasFailedTests) nextSteps.push("Исправить упавшие тесты и повторно запустить проверку");
  if (hasLintErrors) nextSteps.push("Устранить замечания линтера (print/TODO/длинные строки и пр.)");
  if (!hasFailedTests && !hasLintErrors) nextSteps.push("Передать работу на ревью");

  return {
    summary,
    score,
    verdict,
    requirements,
    problems,
    next_steps: nextSteps,
  };
}


