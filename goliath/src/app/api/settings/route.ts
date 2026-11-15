import { NextResponse } from "next/server";
import { handleError, readJson, requireSession } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/db/repositories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { optionalBoolean, optionalNumber, optionalString } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const supabase = await createSupabaseServerClient();
    const settings = await getSettings(supabase, session.userId);
    return NextResponse.json({ settings });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const patch = {
      ...(optionalBoolean(body, "gridView") !== undefined
        ? { gridView: optionalBoolean(body, "gridView") }
        : {}),
      ...(optionalNumber(body, "pageSize", { min: 12, max: 200 }) !== undefined
        ? { pageSize: optionalNumber(body, "pageSize", { min: 12, max: 200 }) }
        : {}),
      ...(optionalBoolean(body, "confirmDelete") !== undefined
        ? { confirmDelete: optionalBoolean(body, "confirmDelete") }
        : {}),
      ...(optionalString(body, "aiProvider", { max: 24 }) !== undefined
        ? { aiProvider: optionalString(body, "aiProvider", { max: 24 }) }
        : {}),
      ...(optionalBoolean(body, "reduceMotion") !== undefined
        ? { reduceMotion: optionalBoolean(body, "reduceMotion") }
        : {}),
    };

    const supabase = await createSupabaseServerClient();
    const settings = await updateSettings(supabase, session.userId, patch);
    return NextResponse.json({ settings });
  } catch (error) {
    return handleError(error);
  }
}