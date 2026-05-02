import { NextRequest, NextResponse } from "next/server";

import {
  fetchPriorityNotifications,
  frontendLog,
} from "@/src/lib/server/evaluation-service";
import { isNotificationType } from "@/src/lib/shared/notifications";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const topN = Math.min(parsePositiveNumber(searchParams.get("topN"), 10), 20);
  const pages = Math.min(parsePositiveNumber(searchParams.get("pages"), 5), 10);
  const typeParam = searchParams.get("type");
  const notificationType = isNotificationType(typeParam) ? typeParam : undefined;

  await frontendLog("info", "api", `priority n=${topN} pages=${pages}`);

  try {
    const priorityNotifications = await fetchPriorityNotifications({
      topN,
      pages,
      notificationType,
    });

    await frontendLog("info", "api", `priority ok c=${priorityNotifications.length}`);
    return NextResponse.json({ priorityNotifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "priority error";
    await frontendLog("error", "api", "priority fail");
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
