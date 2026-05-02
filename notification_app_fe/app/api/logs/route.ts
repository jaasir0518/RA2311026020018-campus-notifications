import { NextRequest, NextResponse } from "next/server";

import { frontendLog, type FrontendLogLevel, type FrontendLogPackage } from "@/src/lib/server/evaluation-service";

type RequestBody = {
  level?: FrontendLogLevel;
  package?: FrontendLogPackage;
  message?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.level || !body.package || !body.message) {
      return NextResponse.json({ message: "missing fields" }, { status: 400 });
    }

    await frontendLog(body.level, body.package, body.message);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
