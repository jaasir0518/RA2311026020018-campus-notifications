import { readFile } from "node:fs/promises";
import process from "node:process";

import { createLogger, type Logger } from "../../logging_middleware/dist/index.js";

const TYPE_WEIGHTS: Record<NotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

type NotificationType = "Placement" | "Result" | "Event";

type Notification = {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
};

type NotificationApiResponse = {
  notifications: Notification[];
  total?: number;
  page?: number;
  limit?: number;
};

type AuthResponse = {
  token_type: string;
  access_token: string;
  expires_in: number;
};

type AuthRequest = {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
};

type RankedNotification = Notification & {
  priorityScore: number;
  recencyRank: number;
};

type Stage1Config = {
  topN: number;
  pageSize: number;
  maxPages: number;
  notificationType?: NotificationType;
  viewedIdsPath?: string;
};

async function main(): Promise<void> {
  await loadLocalEnvFiles();
  const config = parseConfig(process.argv.slice(2));
  const serviceBaseUrl = getEvaluationServiceBaseUrl();
  const logger = createLogger({
    baseUrl: serviceBaseUrl,
    getAccessToken: () => getAccessToken(serviceBaseUrl),
    refreshAccessToken: () => refreshAccessToken(serviceBaseUrl),
  });

  await logSafely(logger, "info", "config", `stage1 topN=${config.topN} size=${config.pageSize}`);

  const viewedIds = await loadViewedIds(config.viewedIdsPath, logger);
  const notifications = await fetchNotifications(config, serviceBaseUrl, logger);
  const unreadNotifications = notifications.filter((notification) => !viewedIds.has(notification.ID));
  await logSafely(
    logger,
    "info",
    "service",
    `unread total=${notifications.length} left=${unreadNotifications.length}`,
  );

  const topNotifications = selectTopNotifications(unreadNotifications, config.topN);
  await logSafely(
    logger,
    "info",
    "service",
    `priority ready count=${topNotifications.length}`,
  );

  printResults(topNotifications);
}

async function loadLocalEnvFiles(): Promise<void> {
  const envFilePaths = [".env", ".env.local", ".env.example"];

  for (const filePath of envFilePaths) {
    try {
      const contents = await readFile(filePath, "utf8");
      applyEnvFile(contents);
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }
}

function applyEnvFile(contents: string): void {
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

    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = stripOptionalQuotes(value);
    }
  }
}

function stripOptionalQuotes(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
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

function parseConfig(args: string[]): Stage1Config {
  const options = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];

    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument sequence near "${key ?? "end of input"}"`);
    }

    options.set(key, value);
  }

  return {
    topN: parsePositiveInt(options.get("--topN") ?? "10", "--topN"),
    pageSize: parsePageSize(options.get("--pageSize") ?? "10"),
    maxPages: parsePositiveInt(options.get("--maxPages") ?? "5", "--maxPages"),
    notificationType: parseNotificationType(options.get("--type")),
    viewedIdsPath: options.get("--viewedIds"),
  };
}

function readAuthConfig(): AuthRequest {
  const email = readRequiredEnv("EVALUATION_EMAIL");
  const name = readRequiredEnv("EVALUATION_NAME");
  const rollNo = readRequiredEnv("EVALUATION_ROLL_NO");
  const accessCode = readRequiredEnv("EVALUATION_ACCESS_CODE");
  const clientID = readRequiredEnv("EVALUATION_CLIENT_ID");
  const clientSecret = readRequiredEnv("EVALUATION_CLIENT_SECRET");

  return {
    email,
    name,
    rollNo,
    accessCode,
    clientID,
    clientSecret,
  };
}

function readRequiredEnv(name: string): string {
  const value = readOptionalEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getEvaluationServiceBaseUrl(): string {
  return normalizeEvaluationServiceBaseUrl(
    process.env.EVALUATION_SERVICE_BASE_URL ?? "https://20.207.122.201/evaluation-service",
  );
}

let cachedAccessToken: string | undefined;

async function getAccessToken(serviceBaseUrl: string): Promise<string> {
  const envToken = readOptionalEnv("EVALUATION_ACCESS_TOKEN");

  if (envToken) {
    return envToken;
  }

  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  return refreshAccessToken(serviceBaseUrl);
}

async function refreshAccessToken(serviceBaseUrl: string): Promise<string> {
  const authRequest = readAuthConfig();
  const response = await fetch(`${serviceBaseUrl}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(authRequest),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Authentication failed with ${response.status}: ${body}`);
  }

  const data = (await response.json()) as AuthResponse;
  cachedAccessToken = data.access_token;
  return cachedAccessToken;
}

async function loadViewedIds(viewedIdsPath: string | undefined, logger: Logger): Promise<Set<string>> {
  if (!viewedIdsPath) {
    await logSafely(logger, "info", "utils", "no viewed file, all unread");
    return new Set<string>();
  }

  const fileContents = await readFile(viewedIdsPath, "utf8");
  const parsed = JSON.parse(fileContents) as string[];
  await logSafely(logger, "info", "utils", `viewed ids loaded=${parsed.length}`);
  return new Set(parsed);
}

async function fetchNotifications(
  config: Stage1Config,
  serviceBaseUrl: string,
  logger: Logger,
): Promise<Notification[]> {
  const notifications: Notification[] = [];

  for (let page = 1; page <= config.maxPages; page += 1) {
    const query = new URLSearchParams({
      limit: String(config.pageSize),
      page: String(page),
    });

    if (config.notificationType) {
      query.set("notification_type", config.notificationType);
    }

    await logSafely(logger, "debug", "route", `fetch page=${page} limit=${config.pageSize}`);
    const response = await authorizedFetch(`${serviceBaseUrl}/notifications?${query.toString()}`, serviceBaseUrl);

    if (!response.ok) {
      const body = await response.text();
      await logSafely(logger, "error", "route", `fetch fail page=${page} code=${response.status}`);
      throw new Error(`Notification fetch failed with ${response.status}: ${body}`);
    }

    const data = (await response.json()) as NotificationApiResponse;
    notifications.push(...data.notifications);
    await logSafely(logger, "info", "route", `page=${page} count=${data.notifications.length}`);

    if (data.notifications.length < config.pageSize) {
      await logSafely(logger, "debug", "route", `stop page=${page} partial`);
      break;
    }
  }

  return notifications;
}

async function authorizedFetch(url: string, serviceBaseUrl: string): Promise<Response> {
  let accessToken = cachedAccessToken ?? (await getAccessToken(serviceBaseUrl));
  let response = await fetchWithToken(url, accessToken);

  if (response.status !== 401) {
    return response;
  }

  accessToken = await refreshAccessToken(serviceBaseUrl);
  return fetchWithToken(url, accessToken);
}

async function fetchWithToken(url: string, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
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

function selectTopNotifications(notifications: Notification[], topN: number): RankedNotification[] {
  const heap = new MinHeap<RankedNotification>((left, right) => compareRankedNotifications(left, right));

  for (const [recencyRank, notification] of notifications
    .slice()
    .sort((left, right) => Date.parse(right.Timestamp) - Date.parse(left.Timestamp))
    .entries()) {
    const rankedNotification: RankedNotification = {
      ...notification,
      recencyRank,
      priorityScore: scoreNotification(notification, recencyRank),
    };

    if (heap.size() < topN) {
      heap.push(rankedNotification);
      continue;
    }

    const smallest = heap.peek();

    if (smallest && compareRankedNotifications(rankedNotification, smallest) > 0) {
      heap.replaceRoot(rankedNotification);
    }
  }

  return heap
    .toArray()
    .sort((left, right) => compareRankedNotifications(right, left));
}

function scoreNotification(notification: Notification, recencyRank: number): number {
  const typeWeight = TYPE_WEIGHTS[notification.Type];
  const recencyBonus = Math.max(0, 1 - recencyRank / 1000);
  return typeWeight * 1000 + recencyBonus;
}

function compareRankedNotifications(left: RankedNotification, right: RankedNotification): number {
  if (left.priorityScore !== right.priorityScore) {
    return left.priorityScore - right.priorityScore;
  }

  return Date.parse(left.Timestamp) - Date.parse(right.Timestamp);
}

function printResults(notifications: RankedNotification[]): void {
  const output = notifications.map((notification, index) => ({
    rank: index + 1,
    id: notification.ID,
    type: notification.Type,
    message: notification.Message,
    timestamp: notification.Timestamp,
    priorityScore: Number(notification.priorityScore.toFixed(4)),
  }));

  process.stdout.write(`${JSON.stringify({ priorityNotifications: output }, null, 2)}\n`);
}

function parsePositiveInt(value: string, optionName: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer`);
  }

  return parsed;
}

function parsePageSize(value: string): number {
  const parsed = parsePositiveInt(value, "--pageSize");

  if (parsed > 10) {
    throw new Error("--pageSize must be at most 10");
  }

  return parsed;
}

function parseNotificationType(value: string | undefined): NotificationType | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "Placement" || value === "Result" || value === "Event") {
    return value;
  }

  throw new Error(`Unsupported notification type: ${value}`);
}

async function logSafely(
  logger: Logger,
  level: "debug" | "info" | "warn" | "error" | "fatal",
  pkg: "route" | "service" | "config" | "utils",
  message: string,
): Promise<void> {
  try {
    await logger.log("backend", level, pkg, message);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Logging failed: ${details}\n`);
  }
}

class MinHeap<T> {
  private readonly items: T[] = [];
  private readonly compare: (left: T, right: T) => number;

  constructor(compare: (left: T, right: T) => number) {
    this.compare = compare;
  }

  size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  push(value: T): void {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  replaceRoot(value: T): void {
    this.items[0] = value;
    this.bubbleDown(0);
  }

  toArray(): T[] {
    return [...this.items];
  }

  private bubbleUp(index: number): void {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (this.compare(this.items[currentIndex], this.items[parentIndex]) >= 0) {
        break;
      }

      this.swap(currentIndex, parentIndex);
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    let currentIndex = index;

    while (true) {
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = currentIndex * 2 + 2;
      let smallestIndex = currentIndex;

      if (
        leftIndex < this.items.length &&
        this.compare(this.items[leftIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = leftIndex;
      }

      if (
        rightIndex < this.items.length &&
        this.compare(this.items[rightIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === currentIndex) {
        return;
      }

      this.swap(currentIndex, smallestIndex);
      currentIndex = smallestIndex;
    }
  }

  private swap(leftIndex: number, rightIndex: number): void {
    [this.items[leftIndex], this.items[rightIndex]] = [this.items[rightIndex], this.items[leftIndex]];
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Stage 1 execution failed: ${message}\n`);
  process.exitCode = 1;
});
