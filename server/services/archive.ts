import fs from "fs";
import path from "path";
import extractZip from "extract-zip";
import { config } from "../config";

export interface FileNode {
  name: string;
  path: string; // relative to root
  isDir: boolean;
  children?: FileNode[];
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listDirEntries(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function removeDirRecursive(targetPath: string): void {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function moveAllChildren(srcDir: string, dstDir: string): void {
  const items = listDirEntries(srcDir);
  for (const item of items) {
    const src = path.join(srcDir, item);
    const dst = path.join(dstDir, item);
    fs.renameSync(src, dst);
  }
}

/**
 * Extract ZIP to WORK_DIR/{projectId}/{runId}.
 * If archive has a single top-level directory, flatten its contents into runDir.
 * Returns absolute path to runDir.
 */
export async function extractZipToRunDir(zipFilePath: string, projectId: string, runId: string): Promise<string> {
  const runDir = path.resolve(config.workDir, projectId, runId);
  ensureDir(runDir);

  // Extract directly into runDir
  await extractZip(zipFilePath, { dir: runDir });

  // Normalize: if runDir contains exactly one directory and no files, move its children up
  const topItems = listDirEntries(runDir);
  let singleDir: string | undefined;
  let filesCount = 0;
  for (const item of topItems) {
    const abs = path.join(runDir, item);
    if (isDirectory(abs)) {
      if (singleDir) {
        singleDir = undefined; // more than one directory
        break;
      }
      singleDir = abs;
    } else {
      filesCount += 1;
    }
  }

  if (filesCount === 0 && singleDir && listDirEntries(runDir).length === 1) {
    moveAllChildren(singleDir, runDir);
    removeDirRecursive(singleDir);
  }

  return runDir;
}

export async function buildFileTree(rootAbsolutePath: string): Promise<FileNode> {
  const rootName = path.basename(rootAbsolutePath);

  const walk = (absPath: string, relPath: string): FileNode => {
    const stat = fs.statSync(absPath);
    const node: FileNode = {
      name: path.basename(absPath),
      path: relPath,
      isDir: stat.isDirectory(),
    };
    if (node.isDir) {
      const childrenNames = fs.readdirSync(absPath, { withFileTypes: true })
        .map((d) => d.name)
        .sort((a, b) => a.localeCompare(b));
      node.children = childrenNames.map((name) => {
        const childAbs = path.join(absPath, name);
        const childRel = relPath ? path.join(relPath, name) : name;
        return walk(childAbs, childRel);
      });
    }
    return node;
  };

  return walk(rootAbsolutePath, "");
}

export async function readFile(rootAbsolutePath: string, relativePath: string): Promise<string> {
  const safeRelative = relativePath.replace(/^\/+/, "");
  const abs = path.resolve(rootAbsolutePath, safeRelative);
  // Prevent path traversal outside root
  const normalizedRoot = path.resolve(rootAbsolutePath);
  if (!abs.startsWith(normalizedRoot + path.sep) && abs !== normalizedRoot) {
    throw new Error("Path is outside of root");
  }
  return fs.readFileSync(abs, "utf-8");
}


