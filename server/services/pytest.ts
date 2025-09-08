import { spawn } from "child_process";

export type PytestResult = {
  passed: number;
  failed: number;
  items: string[]; // простые строки с идентификаторами упавших тестов
  rawOutput: string;
};

function parsePytestOutput(output: string): { passed: number; failed: number; items: string[] } {
  const text = output.replace(/\r/g, "");
  let passed = 0;
  let failed = 0;
  const items: string[] = [];

  // Пробуем вытащить сводку, например: "3 failed, 5 passed in 0.12s"
  const summaryRegex = /(?:^|\n)(?:(\d+)\s+failed)[^\n]*|(?:^|\n)(?:(\d+)\s+passed)/gi;
  let m: RegExpExecArray | null;
  while ((m = summaryRegex.exec(text)) !== null) {
    const failedMatch = m[1];
    const passedMatchIndex = m[0].toLowerCase().indexOf("passed");
    const failedMatchIndex = m[0].toLowerCase().indexOf("failed");
    if (failedMatchIndex !== -1 && failedMatch) {
      const n = parseInt(failedMatch, 10);
      if (!Number.isNaN(n)) failed = Math.max(failed, n);
    }
    if (passedMatchIndex !== -1) {
      const pm = /(?:^|\s)(\d+)\s+passed/.exec(m[0]);
      if (pm) {
        const n = parseInt(pm[1], 10);
        if (!Number.isNaN(n)) passed = Math.max(passed, n);
      }
    }
  }

  // Собираем идентификаторы упавших тестов из строк вида:
  // "FAILED tests/test_mod.py::test_name - AssertionError: ..."
  const failedLineRegex = /^(?:=+\s*)?FAILED\s+([^\s].*?)(?:\s+-\s+.*)?$/gim;
  let f: RegExpExecArray | null;
  while ((f = failedLineRegex.exec(text)) !== null) {
    const id = f[1].trim();
    if (id && !items.includes(id)) items.push(id);
  }

  // Если сводка не нашлась, оценим по символам . F из краткого вывода
  if (passed === 0 && failed === 0) {
    const dots = (text.match(/\n\.|^\./gm) || []).length;
    const Fs = (text.match(/\nF|^F/gm) || []).length;
    if (dots || Fs) {
      passed = dots;
      failed = Fs;
    }
  }

  return { passed, failed, items };
}

export async function runPytest(rootDir: string, opts?: { timeoutMs?: number }): Promise<PytestResult> {
  const timeoutMs = opts?.timeoutMs ?? 60000;
  const argsBase = ["--maxfail=1", "-q", "-rA"]; // краткий вывод + отчёт по всем тестам
  // Пытаемся отключить сеть, если доступен плагин pytest-socket
  const attemptsArgs: string[][] = [[...argsBase, "--disable-socket"], [...argsBase]];

  // Расширим PATH, чтобы захватить user-site bin (часто туда ставится pytest)
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const extraBins = [
    `${home}/Library/Python/3.11/bin`, // macOS user site (Python 3.11)
    `${home}/Library/Python/3.10/bin`,
    `${home}/.local/bin`, // Linux user site
  ];
  const PATH = [process.env.PATH || "", ...extraBins].filter(Boolean).join(":");

  let combinedOutput = "";
  let lastError: Error | null = null;
  // Попытаемся сначала через `pytest`, затем резервно через `python3 -m pytest`
  const commands: Array<{ cmd: string; args: string[] }> = [];
  for (const args of attemptsArgs) {
    commands.push({ cmd: "pytest", args });
    commands.push({ cmd: "python3", args: ["-m", "pytest", ...args] });
  }

  for (const { cmd, args } of commands) {
    combinedOutput = "";
    try {
      const code = await new Promise<number>((resolve, reject) => {
        const child = spawn(cmd, args, {
          cwd: rootDir,
          env: {
            ...process.env,
            PATH,
            // Чуть более предсказуемая среда
            PYTHONDONTWRITEBYTECODE: "1",
            PYTHONUNBUFFERED: "1",
            PYTHONPATH: [rootDir, process.env.PYTHONPATH || ""].filter(Boolean).join(":"),
          },
        });

        const timer = setTimeout(() => {
          child.kill("SIGKILL");
        }, timeoutMs);

        child.stdout?.on("data", (d: Buffer) => {
          combinedOutput += d.toString();
        });
        child.stderr?.on("data", (d: Buffer) => {
          combinedOutput += d.toString();
        });
        child.on("error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          resolve(code ?? 0);
        });
      });

      // Если неизвестная опция --disable-socket, попробуем без неё
      if (/unrecognized arguments: --disable-socket/i.test(combinedOutput)) {
        continue;
      }

      const parsed = parsePytestOutput(combinedOutput);
      return { ...parsed, rawOutput: combinedOutput };
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // Если всё совсем плохо (pytest не стартовал) — вернуть пустой результат с rawOutput/ошибкой
  const parsed = parsePytestOutput(combinedOutput);
  if (lastError && !combinedOutput) {
    combinedOutput = String(lastError.message || lastError);
  }
  return { ...parsed, rawOutput: combinedOutput };
}


