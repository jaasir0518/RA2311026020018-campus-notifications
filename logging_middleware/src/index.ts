export const VALID_STACKS = ["backend", "frontend"] as const;
export const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
export const VALID_PACKAGES = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
  "auth",
  "config",
  "middleware",
  "utils",
] as const;

export type LogStack = (typeof VALID_STACKS)[number];
export type LogLevel = (typeof VALID_LEVELS)[number];
export type LogPackage = (typeof VALID_PACKAGES)[number];

type LogPayload = {
  stack: LogStack;
  level: LogLevel;
  package: LogPackage;
  message: string;
};

export type LoggerConfig = {
  baseUrl: string;
  accessToken?: string;
  getAccessToken?: () => string | Promise<string>;
  refreshAccessToken?: () => string | Promise<string>;
  fetchImpl?: typeof fetch;
};

export class LoggingValidationError extends Error {}

export class Logger {
  private readonly baseUrl: string;
  private accessToken?: string;
  private readonly getAccessToken?: () => string | Promise<string>;
  private readonly refreshAccessToken?: () => string | Promise<string>;
  private readonly fetchImpl: typeof fetch;

  constructor(config: LoggerConfig) {
    this.baseUrl = normalizeEvaluationServiceBaseUrl(config.baseUrl);
    this.accessToken = config.accessToken;
    this.getAccessToken = config.getAccessToken;
    this.refreshAccessToken = config.refreshAccessToken;
    this.fetchImpl = config.fetchImpl ?? fetch;

    if (!this.accessToken && !this.getAccessToken) {
      throw new Error("Logger requires accessToken or getAccessToken");
    }
  }

  async log(stack: LogStack, level: LogLevel, pkg: LogPackage, message: string): Promise<void> {
    validatePayload({ stack, level, package: pkg, message });

    let accessToken = await this.resolveAccessToken();
    let response = await this.sendLogRequest(accessToken, stack, level, pkg, message);

    if (response.status === 401 && this.refreshAccessToken) {
      accessToken = await this.refreshAccessToken();
      this.accessToken = accessToken;
      response = await this.sendLogRequest(accessToken, stack, level, pkg, message);
    }

    if (!response.ok) {
      const errorBody = await safeReadText(response);
      throw new Error(`Logging API failed with ${response.status}: ${errorBody}`);
    }
  }

  private async resolveAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const accessToken = await this.getAccessToken?.();

    if (!accessToken) {
      throw new Error("Logger could not resolve an access token");
    }

    this.accessToken = accessToken;
    return accessToken;
  }

  private async sendLogRequest(
    accessToken: string,
    stack: LogStack,
    level: LogLevel,
    pkg: LogPackage,
    message: string,
  ): Promise<Response> {
    return this.fetchImpl(`${this.baseUrl}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        stack,
        level,
        package: pkg,
        message,
      }),
    });
  }
}

export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

function validatePayload(payload: LogPayload): void {
  if (!VALID_STACKS.includes(payload.stack)) {
    throw new LoggingValidationError(`Invalid stack "${payload.stack}"`);
  }

  if (!VALID_LEVELS.includes(payload.level)) {
    throw new LoggingValidationError(`Invalid level "${payload.level}"`);
  }

  if (!VALID_PACKAGES.includes(payload.package)) {
    throw new LoggingValidationError(`Invalid package "${payload.package}"`);
  }

  if (!payload.message.trim()) {
    throw new LoggingValidationError("Log message cannot be empty");
  }
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeEvaluationServiceBaseUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Logger requires a non-empty baseUrl");
  }

  const withProtocol = /^https?:\/\//u.test(trimmed) ? trimmed : `https://${trimmed}`;
  const normalizedUrl = new URL(withProtocol);

  if (normalizedUrl.hostname === "20.244.56.144") {
    normalizedUrl.hostname = "20.207.122.201";
  }

  normalizedUrl.pathname = ensureEvaluationServicePath(normalizedUrl.pathname);
  return trimTrailingSlash(normalizedUrl.toString());
}

function ensureEvaluationServicePath(pathname: string): string {
  const normalizedPath = trimTrailingSlash(pathname);

  if (!normalizedPath || normalizedPath === "/") {
    return "/evaluation-service";
  }

  if (normalizedPath.endsWith("/evaluation-service")) {
    return normalizedPath;
  }

  return normalizedPath;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "unable to read error response body";
  }
}
