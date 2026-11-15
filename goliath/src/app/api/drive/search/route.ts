import { NextResponse } from "next/server";
import { handleError, jsonError, readJson, requireSession } from "@/lib/api";
import { search } from "@/lib/drive-service";
import { requireString } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return NextResponse.json({ items: [], nextPageToken: null });
    }
    const pageToken = url.searchParams.get("pageToken");
    const pageSize = Number(url.searchParams.get("pageSize") ?? 48);
    const listing = await search(session.userId, q, pageToken, pageSize);
    return NextResponse.json({ items: listing.items, nextPageToken: listing.nextPageToken });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not connected")) {
      return jsonError(401, error.message);
    }
    return handleError(error);
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const q = requireString(body, "q", { min: 2, max: 512 });
    const listing = await search(session.userId, q);
    return NextResponse.json({ items: listing.items, nextPageToken: listing.nextPageToken });
  } catch (error) {
    return handleError(error);
  }
}