import { NextResponse } from "next/server";
import { handleError, jsonError, readJson, requireSession } from "@/lib/api";
import { confirmPendingAction, denyPendingAction } from "@/lib/ai/agent";
import { resolveProvider } from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireString } from "@/lib/validation";
import { appendMessage } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const actionId = requireString(body, "actionId", { min: 1, max: 128 });
    const decision = requireString(body, "decision", { min: 1, max: 16 });

    if (decision === "deny") {
      await denyPendingAction({ userId: session.userId, actionId });
      return NextResponse.json({ ok: true, status: "denied" });
    }
    if (decision !== "confirm") {
      return jsonError(400, "decision must be 'confirm' or 'deny'");
    }

    const provider = resolveProvider(typeof body.provider === "string" ? body.provider : undefined);
    if (!provider) return jsonError(503, "No AI provider is configured");

    const result = await confirmPendingAction({ userId: session.userId, actionId, provider });
    const supabase = await createSupabaseServerClient();
    if (typeof body.conversationId === "string") {
      await appendMessage(supabase, body.conversationId, "assistant", result.reply, {
        confirmation: actionId,
        ok: result.ok,
      });
    }

    return NextResponse.json({ ok: result.ok, reply: result.reply });
  } catch (error) {
    return handleError(error);
  }
}