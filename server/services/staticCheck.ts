import fs from "fs";
import path from "path";
import { config } from "../config";
import { runPytest } from "./pytest";
import { readReviewConfig, processConfigRequirements } from "./checklist";

type LintError = { file: string; line: number; code: string; message: string };

type Requirement = { id: string; title: string; status: "passed" | "failed" | "skipped"; evidence?: string };

export type StaticCheckResult = {
  tests: { passed: number; failed: number; items: any[] };
  lint: { errors: LintError[] };
  metrics: { pyFiles: number; lines: number; todos: number };
  requirements: Requirement[];
};

function walkFiles(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const cur = stack.pop() as string;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) {
        // ignore node_modules and .git by default
        if (e.name === "node_modules" || e.name === ".git" || e.name === "__pycache__") continue;
        stack.push(abs);
      } else if (e.isFile()) {
        out.push(abs);
      }
    }
  }
  return out;
}

function safeRead(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export async function runStaticCheck(rootDir: string): Promise<StaticCheckResult> {
  const files = walkFiles(rootDir);

  const lintErrors: LintError[] = [];
  let pyFilesCount = 0;
  let totalLines = 0;
  let totalTodos = 0;

  // Python checks
  const pyFiles = files.filter((f) => f.toLowerCase().endsWith(".py"));
  pyFilesCount = pyFiles.length;
  for (const file of pyFiles) {
    const content = safeRead(file);
    const lines = content.split(/\r?\n/);
    totalLines += lines.length;
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (/\bprint\s*\(/.test(line)) {
        lintErrors.push({ file, line: lineNum, code: "PY001", message: "print() найден в Python коде" });
      }
      if (/TODO/i.test(line)) {
        totalTodos += 1;
        lintErrors.push({ file, line: lineNum, code: "PY002", message: "TODO найден в коде" });
      }
      if (line.length > 120) {
        lintErrors.push({ file, line: lineNum, code: "PY003", message: "Слишком длинная строка (>120)" });
      }
    });
  }

  // JS/TS simple content checks (no eslint run)
  const jsLike = files.filter((f) => /\.(js|jsx|ts|tsx)$/.test(f));
  for (const file of jsLike) {
    const content = safeRead(file);
    const lines = content.split(/\r?\n/);
    totalLines += lines.length;
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (/TODO/i.test(line)) {
        totalTodos += 1;
        lintErrors.push({ file, line: lineNum, code: "JS001", message: "TODO найден в коде" });
      }
      if (line.length > 140) {
        lintErrors.push({ file, line: lineNum, code: "JS002", message: "Слишком длинная строка (>140)" });
      }
    });
  }

  // Django heuristics: presence of core files and basic model fields
  const lowerMap = new Map<string, string>();
  files.forEach((f) => lowerMap.set(f.toLowerCase(), f));
  const reqs: Requirement[] = [];

  const djangoTargets = ["models.py", "urls.py", "views.py"];
  for (const base of djangoTargets) {
    const found = Array.from(lowerMap.keys()).some((p) => p.endsWith(path.sep + base) || p.endsWith("/" + base));
    reqs.push({ id: `django:${base}`, title: `Django: наличие ${base}`, status: found ? "passed" : "failed" });
  }

  // Basic model fields check: look for common fields in any models.py
  const modelFiles = files.filter((f) => f.toLowerCase().endsWith("models.py"));
  const basicFieldRegex = /(models\.(CharField|TextField|IntegerField|Date(Time)?Field|ForeignKey))/;
  let fieldsEvidence = "";
  let fieldsOk = false;
  for (const mf of modelFiles) {
    const c = safeRead(mf);
    if (basicFieldRegex.test(c)) {
      fieldsOk = true;
      fieldsEvidence = `В файле ${mf} найдены базовые поля моделей`;
      break;
    }
  }
  reqs.push({ id: "django:basic-model-fields", title: "Django: базовые поля модели", status: fieldsOk ? "passed" : "failed", evidence: fieldsEvidence || "Поля не обнаружены" });

  // JS: eslint optional — мы не запускаем eslint, только простые проверки выше
  // Добавим требование как skipped, если нет node_modules; иначе passed (наличие среды)
  const hasNodeModules = files.some((f) => f.includes(`${path.sep}node_modules${path.sep}`)) || fs.existsSync(path.join(rootDir, "node_modules"));
  reqs.push({ id: "js:eslint", title: "JS: ESLint (опционально)", status: hasNodeModules ? "skipped" : "skipped", evidence: hasNodeModules ? "node_modules присутствует, но ESLint не запускался" : "node_modules отсутствует" });

  // Читаем конфигурационный файл review.yaml|yml|json и добавляем требования из него
  const reviewConfig = readReviewConfig(rootDir);
  if (reviewConfig) {
    const configRequirements = processConfigRequirements(reviewConfig, rootDir, files);
    reqs.push(...configRequirements);
  }

  const result: StaticCheckResult = {
    tests: { passed: 0, failed: 0, items: [] },
    lint: { errors: lintErrors },
    metrics: { pyFiles: pyFilesCount, lines: totalLines, todos: totalTodos },
    requirements: reqs,
  };
  // Опционально запускаем pytest локально, если разрешено флагом
  if (config.enablePytest) {
    try {
      const py = await runPytest(rootDir, { timeoutMs: 120_000 });
      result.tests.passed += py.passed;
      result.tests.failed += py.failed;
      // Добавляем простые записи фейлов в items
      for (const item of py.items) {
        result.tests.items.push({ id: item, status: "failed" });
      }
      // Диагностика: если парсинг не нашёл результатов, приложим сырой вывод
      if (py.passed === 0 && py.failed === 0 && py.rawOutput) {
        result.tests.items.push({ id: "pytest-raw", status: "failed", message: py.rawOutput.slice(0, 2000) });
      }
    } catch (e: any) {
      // Если pytest упал до запуска, фиксируем как системную ошибку в items
      result.tests.items.push({ id: "pytest-error", status: "failed", message: String(e?.message ?? e) });
    }
  }

  return result;
}


