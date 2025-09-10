import * as fs from "node:fs/promises";
import * as path from "node:path";

const cache = new Map<string, string>();

function normalizeMarkers(text: string): string {
  // Меняем тройные скобки на двойные, оставляя остальной текст нетронутым.
  return text.replaceAll("<<<", "<<").replaceAll(">>>", ">>");
}

function decodeBasicEntities(text: string): string {
  // Минимальная декодировка без сторонних зависимостей.
  return text
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}

function htmlToText(html: string): string {
  // 1) вырезаем script/style
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "")
             .replace(/<style[\s\S]*?<\/style>/gi, "");
  // 2) заменяем брейки и блоки на переносы строк
  html = html.replace(/<br\s*\/?>/gi, "\n");
  const blockTags = ["p","div","section","article","header","footer","main","aside","nav","table","thead","tbody","tfoot","tr","td","th","h1","h2","h3","h4","h5","h6"];
  for (const tag of blockTags) {
    const reOpen = new RegExp(`<${tag}\\b[^>]*>`, "gi");
    const reClose = new RegExp(`</${tag}>`, "gi");
    html = html.replace(reOpen, "\n").replace(reClose, "\n");
  }
  // 3) списки — добавим маркеры
  html = html.replace(/<li\b[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "");
  html = html.replace(/<ul\b[^>]*>/gi, "\n").replace(/<\/ul>/gi, "\n");
  html = html.replace(/<ol\b[^>]*>/gi, "\n").replace(/<\/ol>/gi, "\n");

  // 4) code/pre — обозначим тройными бэктиками
  html = html.replace(/<pre\b[^>]*>/gi, "\n```\n").replace(/<\/pre>/gi, "\n```\n");
  html = html.replace(/<code\b[^>]*>/gi, "`").replace(/<\/code>/gi, "`");

  // 5) удаляем прочие теги
  html = html.replace(/<\/?[^>]+>/g, "");

  // 6) декодируем базовые сущности и нормализуем пробелы
  let txt = decodeBasicEntities(html);
  txt = txt.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  // 7) нормализуем маркеры ошибок
  return normalizeMarkers(txt);
}

async function readPromptFromHtml(absPath: string): Promise<string> {
  const key = `html:${absPath}`;
  if (cache.has(key)) return cache.get(key)!;
  const raw = await fs.readFile(absPath, "utf8");
  const text = htmlToText(raw);
  cache.set(key, text);
  return text;
}

function resolvePathMaybe(envName: string, fallbackRel: string): string {
  const p = process.env[envName];
  if (p && p.trim()) return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  return path.join(process.cwd(), fallbackRel);
}

export async function getReportSystemPromptFromHtml(): Promise<string> {
  const abs = resolvePathMaybe("REPORT_PROMPT_HTML_PATH", "server/llm/prompts/Отчет студенту.html");
  return readPromptFromHtml(abs);
}

export async function getClassifierSystemPromptFromHtml(): Promise<string> {
  const abs = resolvePathMaybe("CLASSIFIER_PROMPT_HTML_PATH", "server/llm/prompts/Классификатор.html");
  return readPromptFromHtml(abs);
}
