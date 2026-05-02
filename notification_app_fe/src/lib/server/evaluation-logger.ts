const VALID_STACKS = ["backend", "frontend"] as const;
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
const VALID_PACKAGES = [
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

type LoggerConfig = {
  baseUrl: string;
  accessToken?: string;
  getAccessToken?: () => string | Promise<string>;
  refreshAccessToken?: () => string | Promise<string>;
};

type LogPayload = {
  stack: LogStack;
  level: LogLevel;
  package: LogPackage;
  message: string;
};

export function createLogger(config: LoggerConfig) {
  let cachedAccessToken = config.accessToken;

  return {
    async log(stack: LogStack, level: LogLevel, pkg: LogPackage, message: string) {
      validatePayload({
        stack,
        level,
        package: pkg,
        message,
      });

      let accessToken = await resolveAccessToken();
      let response = await sendLogRequest(config.baseUrl, accessToken, stack, level, pkg, message);

      if (response.status === 401 && config.refreshAccessToken) {
        accessToken = await config.refreshAccessToken();
        cachedAccessToken = accessToken;
        response = await sendLogRequest(config.baseUrl, accessToken, stack, level, pkg, message);
      }

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Logging API failed with ${response.status}: ${details}`);
      }
    },
  };

  async function resolveAccessToken(): Promise<string> {
    if (cachedAccessToken) {
      return cachedAccessToken;
    }

    const accessToken = await config.getAccessToken?.();

    if (!accessToken) {
      throw new Error("Logger could not resolve an access token");
    }

    cachedAccessToken = accessToken;
    return accessToken;
  }
}

async function sendLogRequest(
  baseUrl: string,
  accessToken: string,
  stack: LogStack,
  level: LogLevel,
  pkg: LogPackage,
  message: string,
): Promise<Response> {
  return fetch(`${normalizeEvaluationServiceBaseUrl(baseUrl)}/logs`, {
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

function validatePayload(payload: LogPayload): void {
  if (!VALID_STACKS.includes(payload.stack)) {
    throw new Error(`Invalid stack "${payload.stack}"`);
  }

  if (!VALID_LEVELS.includes(payload.level)) {
    throw new Error(`Invalid level "${payload.level}"`);
  }

  if (!VALID_PACKAGES.includes(payload.package)) {
    throw new Error(`Invalid package "${payload.package}"`);
  }

  if (!payload.message.trim()) {
    throw new Error("Log message cannot be empty");
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
