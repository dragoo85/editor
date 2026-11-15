import { NextResponse } from "next/server";
import { handleError, jsonError, requireSession } from "@/lib/api";
import { usage } from "@/lib/drive-service";
import { formatBytes } from "@/lib/transfer/plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const storage = await usage(session.userId);
    const freeBytes = Math.max(0, storage.limitBytes - storage.usedBytes);
    return NextResponse.json({
      ...storage,
      freeBytes,
      limitLabel: storage.limitBytes ? formatBytes(storage.limitBytes) : "unlimited",
      usedLabel: formatBytes(storage.usedBytes),
      freeLabel: formatBytes(freeBytes),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not connected")) {
      return jsonError(401, error.message);
    }
    return handleError(error);
  }
}