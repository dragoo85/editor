import { NextResponse } from "next/server";
import { handleError, jsonError, requireSession } from "@/lib/api";
import { rootFolderId } from "@/lib/drive-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const rootId = await rootFolderId(session.userId);
    return NextResponse.json({ rootId });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not connected")) {
      return jsonError(401, error.message);
    }
    return handleError(error);
  }
}