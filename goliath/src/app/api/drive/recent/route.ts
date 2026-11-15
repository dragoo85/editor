import { NextResponse } from "next/server";
import { handleError, jsonError, requireSession } from "@/lib/api";
import { listRecentFiles } from "@/lib/db/repositories";
import { rowToItem } from "@/lib/db/map";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clampInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const url = new URL(request.url);
    const limit = clampInt(Number(url.searchParams.get("limit") ?? 60), 1, 200);
    const supabase = await createSupabaseServerClient();
    const rows = await listRecentFiles(supabase, session.userId, limit);
    return NextResponse.json({ items: rows.map(rowToItem) });
  } catch (error) {
    return handleError(error);
  }
}