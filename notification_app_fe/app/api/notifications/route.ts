import { NextRequest, NextResponse } from "next/server";

import { fetchNotificationsPage, frontendLog } from "@/src/lib/server/evaluation-service";
import { isNotificationType } from "@/src/lib/shared/notifications";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parsePositiveNumber(searchParams.get("page"), 1);
  const limit = Math.min(parsePositiveNumber(searchParams.get("limit"), 10), 10);
  const typeParam = searchParams.get("type");
  const notificationType = isNotificationType(typeParam) ? typeParam : undefined;

  await frontendLog("info", "api", `feed p=${page} l=${limit}`);

  try {
    const result = await fetchNotificationsPage({
      limit,
      page,
      notificationType,
    });

    await frontendLog("info", "api", `feed ok p=${page} c=${result.notifications.length}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "feed error";
    await frontendLog("error", "api", `feed fail p=${page}`);
    return NextResponse.json({ message }, { status: 500 });
  }
}

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
