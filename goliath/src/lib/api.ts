import { NextResponse } from "next/server";
import { getSessionUser } from "./supabase/server";
import { isSupabaseConfigured } from "./env";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function requireSession(): Promise<{ userId: string } | NextResponse> {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "GOLIATH is not configured. Add Supabase credentials to .env.local.", {
      code: "not_configured",
    });
  }
  const user = await getSessionUser();
  if (!user) return jsonError(401, "You must be signed in");
  return { userId: user.id };
}

export function handleError(error: unknown): NextResponse {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status) || 500
      : 500;
  const message = error instanceof Error ? error.message : "Unexpected error";
  const safeStatus = [400, 401, 403, 404, 409, 429].includes(status) ? status : 500;
  if (safeStatus === 500) {
    console.error("[goliath] unhandled error", error);
    return jsonError(500, "Internal server error");
  }
  return jsonError(safeStatus, message);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}