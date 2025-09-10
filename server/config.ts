import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env at project root
const projectRoot = path.resolve(import.meta.dirname, "..");
const envPath = path.join(projectRoot, ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

// Normalize directories to absolute paths based on project root
function resolveDir(dir: string): string {
  if (dir.startsWith("/")) return dir;
  return path.resolve(projectRoot, dir);
}

export const config = {
  apiBaseUrl: requireEnv("VITE_API_BASE_URL", "/api"),
  uploadDir: resolveDir(requireEnv("UPLOAD_DIR", "./data/uploads")),
  workDir: resolveDir(requireEnv("WORK_DIR", "./data/work")),
  artifactsDir: resolveDir(requireEnv("ARTIFACTS_DIR", "./data/artifacts")),
  maxUploadMb: parseInt(requireEnv("MAX_UPLOAD_MB", "100"), 10),
  enablePytest: requireEnv("ENABLE_PYTEST", "false").toLowerCase() === "true",
  enableLlm: (process.env.ENABLE_LLM ?? "false").toLowerCase() === "true",
  enableLlmOnly: (process.env.ENABLE_LLM_ONLY ?? "false").toLowerCase() === "true",
  yandex: {
    apiKey: optionalEnv("YC_API_KEY"),
    folderId: optionalEnv("YC_FOLDER_ID"),
    modelUri: process.env.YC_MODEL_URI || (process.env.YC_FOLDER_ID ? `gpt://${process.env.YC_FOLDER_ID}/yandexgpt-lite/latest` : undefined)
  },
  llm: {
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 30000),
    maxRetries: Number(process.env.LLM_MAX_RETRIES ?? 2),
    retryBaseMs: Number(process.env.LLM_RETRY_BASE_MS ?? 1000),
    allowedExts: (process.env.LLM_ALLOWED_EXTS ?? "").split(",").map(s => s.trim()).filter(Boolean),
    excludedDirs: (process.env.LLM_EXCLUDED_DIRS ?? "").split(",").map(s => s.trim()).filter(Boolean),
    maxFiles: Number(process.env.LLM_MAX_FILES ?? 400),
    maxFileBytes: Number(process.env.LLM_MAX_FILE_BYTES ?? 200000),
    maxTotalBytes: Number(process.env.LLM_MAX_TOTAL_BYTES ?? 800000),
  }
};

// Если включён enableLlmOnly — считаем, что enableLlm тоже логически включён:
if (config.enableLlmOnly) (config as any).enableLlm = true;

export type AppConfig = typeof config;


