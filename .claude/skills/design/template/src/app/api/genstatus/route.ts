import { NextResponse } from "next/server";
import { cliStatus } from "@/lib/higgsfieldCli";

export const runtime = "nodejs";

export async function GET() {
  const status = await cliStatus();
  // `ready` drives the panel; `reason` tells the user which step is missing.
  return NextResponse.json({
    ready: status.authenticated,
    installed: status.installed,
    reason: status.reason,
  });
}
