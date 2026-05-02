import {
  createLogger,
  type LogLevel,
  type LogPackage,
} from "@/src/lib/server/evaluation-logger";

import { computePriorityNotifications } from "@/src/lib/shared/notifications";
import { readOptionalEnv, readRequiredEnv } from "@/src/lib/server/env";
import type { NotificationApiResponse, NotificationItem, NotificationType, RankedNotification } from "@/src/types/notification";

const DEFAULT_BASE_URL = "https://20.207.122.201/evaluation-service";

type AuthResponse = {
  access_token: string;
};

type AuthRequest = {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
};

export type FrontendLogLevel = Extract<LogLevel, "debug" | "info" | "warn" | "error" | "fatal">;
export type FrontendLogPackage = Extract<
  LogPackage,
  "api" | "page" | "component" | "state" | "auth" | "config" | "middleware" | "utils"
>;

export async function frontendLog(
  level: FrontendLogLevel,
  pkg: FrontendLogPackage,
  message: string,
): Promise<void> {
  try {
    const logger = createLogger({
      baseUrl: getBaseUrl(),
      getAccessToken,
      refreshAccessToken,
    });

    await logger.log("frontend", level, pkg, truncate(message));
  } catch {
    // Best-effort logging for evaluation compatibility.
  }
}

export async function fetchNotificationsPage(options: {
  limit: number;
  page: number;
  notificationType?: NotificationType;
}): Promise<NotificationApiResponse> {
  const searchParams = new URLSearchParams({
    limit: String(Math.min(options.limit, 10)),
    page: String(options.page),
  });

  if (options.notificationType) {
    searchParams.set("notification_type", options.notificationType);
  }

  const response = await authorizedFetch(`${getBaseUrl()}/notifications?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Notifications API failed with ${response.status}`);
  }

  return (await response.json()) as NotificationApiResponse;
}

export async function fetchPriorityNotifications(options: {
  topN: number;
  pages: number;
  notificationType?: NotificationType;
}): Promise<RankedNotification[]> {
  const notifications: NotificationItem[] = [];

  for (let page = 1; page <= options.pages; page += 1) {
    const pageResult = await fetchNotificationsPage({
      page,
      limit: 10,
      notificationType: options.notificationType,
    });

    notifications.push(...pageResult.notifications);

    if (pageResult.notifications.length < 10) {
      break;
    }
  }

  return computePriorityNotifications(notifications, options.topN);
}

function getBaseUrl(): string {
  return normalizeEvaluationServiceBaseUrl(readOptionalEnv("EVALUATION_SERVICE_BASE_URL") ?? DEFAULT_BASE_URL);
}

let cachedAccessToken: string | undefined;

async function getAccessToken(): Promise<string> {
  const envToken = readOptionalEnv("EVALUATION_ACCESS_TOKEN");

  if (envToken) {
    return envToken;
  }

  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const authRequest: AuthRequest = {
    email: readRequiredEnv("EVALUATION_EMAIL"),
    name: readRequiredEnv("EVALUATION_NAME"),
    rollNo: readRequiredEnv("EVALUATION_ROLL_NO"),
    accessCode: readRequiredEnv("EVALUATION_ACCESS_CODE"),
    clientID: readRequiredEnv("EVALUATION_CLIENT_ID"),
    clientSecret: readRequiredEnv("EVALUATION_CLIENT_SECRET"),
  };

  const response = await fetch(`${getBaseUrl()}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(authRequest),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Auth API failed with ${response.status}`);
  }

  const data = (await response.json()) as AuthResponse;
  cachedAccessToken = data.access_token;
  return cachedAccessToken;
}

async function refreshAccessToken(): Promise<string> {
  const authRequest: AuthRequest = {
    email: readRequiredEnv("EVALUATION_EMAIL"),
    name: readRequiredEnv("EVALUATION_NAME"),
    rollNo: readRequiredEnv("EVALUATION_ROLL_NO"),
    accessCode: readRequiredEnv("EVALUATION_ACCESS_CODE"),
    clientID: readRequiredEnv("EVALUATION_CLIENT_ID"),
    clientSecret: readRequiredEnv("EVALUATION_CLIENT_SECRET"),
  };

  const response = await fetch(`${getBaseUrl()}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(authRequest),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Auth API failed with ${response.status}`);
  }

  const data = (await response.json()) as AuthResponse;
  cachedAccessToken = data.access_token;
  return cachedAccessToken;
}

async function authorizedFetch(url: string): Promise<Response> {
  let accessToken = cachedAccessToken ?? (await getAccessToken());
  let response = await fetchWithToken(url, accessToken);

  if (response.status !== 401) {
    return response;
  }

  accessToken = await refreshAccessToken();
  response = await fetchWithToken(url, accessToken);
  return response;
}

async function fetchWithToken(url: string, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

function truncate(message: string): string {
  const trimmed = message.trim();
  return trimmed.length <= 48 ? trimmed : trimmed.slice(0, 48);
}

function normalizeEvaluationServiceBaseUrl(value: string): string {
  const trimmed = value.trim();
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

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
