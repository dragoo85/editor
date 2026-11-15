import { NextResponse } from "next/server";
import { handleError, jsonError, requireSession } from "@/lib/api";
import { listFolder } from "@/lib/drive-service";
import { clampInt } from "@/lib/validation";
import type { DriveItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const url = new URL(request.url);
    const folderParam = url.searchParams.get("folderId");
    const pageToken = url.searchParams.get("pageToken");
    const sort = url.searchParams.get("sort") ?? "name:asc";
    const pageSize = clampInt(Number(url.searchParams.get("pageSize") ?? 48), 1, 200);

    const listing = await listFolder(session.userId, {
      folderId: folderParam === null ? undefined : folderParam === "root" ? null : folderParam,
      pageToken,
      pageSize,
      sort,
    });

    const payload: { items: DriveItem[]; nextPageToken: string | null } = {
      items: listing.items,
      nextPageToken: listing.nextPageToken,
    };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not connected")) {
      return jsonError(401, error.message);
    }
    return handleError(error);
  }
}