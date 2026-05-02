"use client";

export async function logClientEvent(
  level: "debug" | "info" | "warn" | "error" | "fatal",
  pkg: "page" | "component" | "state" | "api" | "utils",
  message: string,
): Promise<void> {
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        level,
        package: pkg,
        message: message.length <= 48 ? message : message.slice(0, 48),
      }),
    });
  } catch {
    // Client logging should never block the UX.
  }
}
