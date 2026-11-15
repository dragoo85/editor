import { NextResponse } from "next/server";
import { handleError, jsonError, requireSession } from "@/lib/api";
import { driveToken } from "@/lib/drive-service";
import { getMetadata } from "@/lib/google/drive";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");
    if (!fileId) return jsonError(400, "fileId is required");

    const token = await driveToken(session.userId);
    const item = await getMetadata(token, fileId);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not connected")) {
      return jsonError(401, error.message);
    }
    return handleError(error);
  }
}