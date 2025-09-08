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
};

export type AppConfig = typeof config;


