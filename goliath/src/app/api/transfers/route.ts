import { NextResponse } from "next/server";
import { handleError, jsonError, readJson, requireSession } from "@/lib/api";
import { listTransfers, upsertTransfers } from "@/lib/db/repositories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clampInt } from "@/lib/validation";
import { newUploadId } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const url = new URL(request.url);
    const limit = clampInt(Number(url.searchParams.get("limit") ?? 50), 1, 200);
    const supabase = await createSupabaseServerClient();
    const transfers = await listTransfers(supabase, session.userId, limit);
    return NextResponse.json({ transfers });
  } catch (error) {
    return handleError(error);
  }
}

/** Client-side transfer bookkeeping (queued/failed items that never reached the server). */
export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const entries = Array.isArray(body.transfers) ? body.transfers : [];
    if (entries.length === 0) return jsonError(400, "transfers array is required");
    if (entries.length > 50) return jsonError(400, "Too many entries");

    const supabase = await createSupabaseServerClient();
    const rows = entries.map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        id: typeof record.id === "string" ? record.id : newUploadId(),
        kind: record.kind === "download" ? "download" : "upload",
        drive_file_id: typeof record.drive_file_id === "string" ? record.drive_file_id : null,
        name: String(record.name ?? "transfer").slice(0, 255),
        mime_type: String(record.mime_type ?? "application/octet-stream").slice(0, 128),
        size: Number(record.size ?? 0) || 0,
        bytes_transferred: Number(record.bytes_transferred ?? 0) || 0,
        chunk_size: Number(record.chunk_size ?? 0) || 0,
        status: String(record.status ?? "queued"),
        error: typeof record.error === "string" ? record.error.slice(0, 500) : null,
        created_at: new Date().toISOString(),
        completed_at: record.status === "completed" ? new Date().toISOString() : null,
      };
    });

    await upsertTransfers(supabase, session.userId, rows as never);
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (error) {
    return handleError(error);
  }
}