import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { config } from "../config";

function looksBinary(buf: Buffer) {
  // Простая эвристика: наличие NUL-байта или высокий процент нестандартных символов
  if (buf.includes(0)) return true;
  let nonPrintable = 0;
  for (const b of buf) if ((b < 9 || (b > 13 && b < 32)) && b !== 0) nonPrintable++;
  return nonPrintable / Math.max(1, buf.length) > 0.3;
}

function normalizeText(s: string) {
  // Убираем BOM, CRLF, дубликаты пустых строк, трим по краям
  return s.replace(/^\uFEFF/, "")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
}

function isAllowedFile(p: string) {
  const exts = config.llm.allowedExts;
  if (!exts.length) return true;
  const ext = "." + (p.split(".").pop() || "").toLowerCase();
  return exts.includes(ext);
}

function isExcludedDir(rel: string) {
  const parts = rel.split(/[\\/]+/);
  return parts.some(part => config.llm.excludedDirs.includes(part));
}

export async function buildSnapshotForLLM(workRoot: string) {
  const files: Array<{ path: string; content: string; bytes: number }> = [];
  let total = 0;
  const maxFiles = config.llm.maxFiles;
  const maxFile = config.llm.maxFileBytes;
  const maxTotal = config.llm.maxTotalBytes;

  async function walk(relDir: string) {
    const absDir = path.join(workRoot, relDir);
    const entries = await fsp.readdir(absDir, { withFileTypes: true });
    for (const e of entries) {
      const rel = path.join(relDir, e.name);
      if (e.isDirectory()) {
        if (isExcludedDir(rel)) continue;
        await walk(rel);
      } else {
        if (!isAllowedFile(rel)) continue;
        const abs = path.join(workRoot, rel);
        try {
          const buf = await fsp.readFile(abs);
          if (buf.length > maxFile || looksBinary(buf)) continue;
          const text = normalizeText(buf.toString("utf8"));
          const bytes = Buffer.byteLength(text, "utf8");
          if (bytes === 0) continue;
          if (total + bytes > maxTotal) continue;
          files.push({ path: rel.replace(/\\/g, "/"), content: text, bytes });
          total += bytes;
          if (files.length >= maxFiles) return;
        } catch { /* ignore */ }
      }
    }
  }
  await walk("");

  // Сортируем файлы: короткие выше, чтобы вероятнее влезли важные конфиги/мелкие файлы
  files.sort((a, b) => a.bytes - b.bytes);

  // Готовим дерево
  function sortTree(a: any, b: any) {
    if (!!a.isDir !== !!b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, "en");
  }
  async function buildTree(dirRel = ""): Promise<any> {
    const abs = path.join(workRoot, dirRel);
    const ents = await fsp.readdir(abs, { withFileTypes: true });
    const children = [];
    for (const e of ents) {
      const rel = path.join(dirRel, e.name);
      if (e.isDirectory()) {
        if (isExcludedDir(rel)) continue;
        children.push(await buildTree(rel));
      } else {
        if (!isAllowedFile(rel)) continue;
        children.push({ name: e.name, isDir: false, path: rel.replace(/\\/g, "/") });
      }
    }
    children.sort(sortTree);
    return { name: dirRel || "project-root", isDir: true, path: dirRel, children };
  }
  const treeNode = await buildTree();
  function renderTree(n: any, prefix = ""): string {
    const here = `${prefix}${n.name}`;
    if (!n.children || n.children.length === 0) return here;
    const lines = [here];
    for (const c of n.children) lines.push(renderTree(c, prefix + "  "));
    return lines.join("\n");
  }
  const tree = renderTree(treeNode);

  return {
    tree,
    files: files.map(f => ({ path: f.path, content: f.content })),
    metrics: {
      fileCount: files.length,
      totalBytes: total,
      maxFiles,
      maxFileBytes: maxFile,
      maxTotalBytes: maxTotal
    }
  };
}
