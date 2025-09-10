import * as fs from "node:fs/promises";
import * as path from "node:path";

export type ProjectFile = { path: string; content: string };
export type IssueRange = {
  startLine: number; startCol: number;
  endLine: number; endCol: number;
};
export type LlmIssue = {
  filePath: string;
  snippet: string;
  ranges: IssueRange[];
  message?: string;      // из "Комментарий:"
  errorNumber?: number;  // из "Ошибка №N"
};

function buildLineIndex(text: string): number[] {
  const idx = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") idx.push(i + 1);
  return idx;
}

function posToLineCol(lineIdx: number[], pos: number) {
  // бинарный поиск по массиву start-индексов строк
  let lo = 0, hi = lineIdx.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineIdx[mid] <= pos) lo = mid + 1; else hi = mid - 1;
  }
  const line = hi + 1; // 1-based
  const col = pos - lineIdx[hi] + 1; // 1-based
  return { line, col };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractErrorBlocks(report: string) {
  // Парсим блоки: Ошибка №N ... Файл: ... Фрагмент: ... Комментарий: ...
  const blocks: { n?: number; file?: string; fragment?: string; comment?: string }[] = [];
  const reBlock = /(Ошибка\s*№\s*(\d+)[^\n]*\n[\s\S]*?)(?=Ошибка\s*№|\Z)/gi;
  const parts = report.match(reBlock) || [];
  for (const part of parts) {
    const nMatch = part.match(/Ошибка\s*№\s*(\d+)/i);
    const fileMatch = part.match(/Файл:\s*(.+)/i);
    // Фрагмент: берём до "Комментарий:" или конца блока
    const fragMatch = part.match(/Фрагмент:\s*\n([\s\S]*?)(?:\n\s*Комментарий:|\Z)/i);
    const commentMatch = part.match(/Комментарий:\s*([\s\S]*)/i);
    blocks.push({
      n: nMatch ? Number(nMatch[1]) : undefined,
      file: fileMatch ? fileMatch[1].trim() : undefined,
      fragment: fragMatch ? fragMatch[1].trim() : undefined,
      comment: commentMatch ? commentMatch[1].trim() : undefined
    });
  }
  return blocks;
}

function extractMarkers(text?: string) {
  if (!text) return [];
  const re = /<<([\s\S]*?)>>/g;
  const results: string[] = [];
  let m;
  while ((m = re.exec(text)) !== null) results.push(m[1].trim());
  return results;
}

function findRangesInFile(content: string, snippet: string): IssueRange[] {
  // Простая стратегия MVP: точный поиск подстроки.
  // Нормализуем переводы строк для надёжности.
  const body = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const needle = snippet.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const ranges: IssueRange[] = [];
  if (!needle) return ranges;

  let from = 0;
  while (true) {
    const idx = body.indexOf(needle, from);
    if (idx === -1) break;
    const start = idx;
    const end = idx + needle.length;
    const lineIdx = buildLineIndex(body);
    const { line: startLine, col: startCol } = posToLineCol(lineIdx, start);
    const { line: endLine, col: endCol } = posToLineCol(lineIdx, end);
    ranges.push({ startLine, startCol, endLine, endCol });
    from = end; // ищем дальше
  }
  return ranges;
}

function resolveFilePath(files: ProjectFile[], requested?: string): { path: string; content: string } | undefined {
  if (!requested) return undefined;
  const norm = (p: string) => p.replace(/\\/g, "/");
  const req = norm(requested.trim());

  // 1) точное совпадение
  let found = files.find(f => norm(f.path) === req);
  if (found) return { path: found.path, content: found.content };

  // 2) по basename (если студент/LLM дал укороченный путь)
  const base = req.split("/").pop()!;
  const candidates = files.filter(f => norm(f.path).endsWith("/" + base) || norm(f.path) === base);
  if (candidates.length === 1) return { path: candidates[0].path, content: candidates[0].content };

  // 3) выбираем с наибольшим общим суффиксом
  let best: ProjectFile | undefined;
  let bestScore = -1;
  for (const f of files) {
    const a = norm(f.path);
    const b = req;
    let i = 0;
    while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    if (i > bestScore) { bestScore = i; best = f; }
  }
  return best ? { path: best.path, content: best.content } : undefined;
}

export async function extractIssuesFromReport(runId: string, reportText: string, files: ProjectFile[]) {
  const blocks = extractErrorBlocks(reportText);
  const issues: LlmIssue[] = [];

  for (const b of blocks) {
    const markers = extractMarkers(b.fragment);
    if (!markers.length) continue;

    const resolved = resolveFilePath(files, b.file);
    if (!resolved) continue;

    const perMarker: IssueRange[] = [];
    for (const snippet of markers) {
      const ranges = findRangesInFile(resolved.content, snippet);
      if (!ranges.length) {
        // Если точного попадания нет — пока пропускаем (фазу «фуззи» добавим позже).
        continue;
      }
      issues.push({
        filePath: resolved.path,
        snippet,
        ranges,
        message: b.comment,
        errorNumber: b.n
      });
    }
  }

  const dir = path.join(process.cwd(), "data", "artifacts", runId);
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, "llm_issues.json");
  await fs.writeFile(outPath, JSON.stringify({ issues }, null, 2), "utf8");
  return { issues, outPath };
}
