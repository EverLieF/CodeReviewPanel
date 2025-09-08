import { promises as fs } from "fs";
import path from "path";
import { config } from "../config";
import { runStaticCheck, type StaticCheckResult } from "./staticCheck";

export type ChecksArtifact = {
  runId: string;
  createdAt: string;
  staticCheck: StaticCheckResult;
};

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch {
    // ignore
  }
}

export async function collectChecks(runId: string, rootDir: string): Promise<ChecksArtifact> {
  const staticCheck = await runStaticCheck(rootDir);

  const artifact: ChecksArtifact = {
    runId,
    createdAt: new Date().toISOString(),
    staticCheck,
  };

  const runDir = path.join(config.artifactsDir, runId);
  await ensureDir(runDir);
  const filePath = path.join(runDir, "checks.json");
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(artifact, null, 2), "utf-8");
  await fs.rename(tmp, filePath);

  return artifact;
}


