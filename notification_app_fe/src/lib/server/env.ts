import { readFileSync } from "node:fs";
import path from "node:path";

let envLoaded = false;

export function ensureEvaluationEnv(): void {
  if (envLoaded) {
    return;
  }

  const envFiles = [".env.local", ".env", ".env.example"];
  const candidatePaths = [
    ...envFiles.map((fileName) => path.join(process.cwd(), fileName)),
    ...envFiles.map((fileName) => path.join(process.cwd(), "..", "notification_app_be", fileName)),
  ];

  for (const filePath of candidatePaths) {

    try {
      const contents = readFileSync(filePath, "utf8");
      applyEnv(contents);
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }

  envLoaded = true;
}

export function readRequiredEnv(name: string): string {
  ensureEvaluationEnv();
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function readOptionalEnv(name: string): string | undefined {
  ensureEvaluationEnv();
  const value = process.env[name]?.trim();
  return value || undefined;
}

function applyEnv(contents: string): void {
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = stripQuotes(value);
    }
  }
}

function stripQuotes(value: string): string {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
