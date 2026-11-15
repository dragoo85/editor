import { NextResponse } from "next/server";
import { handleError, jsonError, readJson, requireSession } from "@/lib/api";
import { getAccountStatus } from "@/lib/google/account";
import { resolveProvider } from "@/lib/ai";
import { runAgentTurn } from "@/lib/ai/agent";
import { appendMessage, createConversation, listConversations, listMessages } from "@/lib/db/repositories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireString } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    const supabase = await createSupabaseServerClient();

    if (conversationId) {
      const messages = await listMessages(supabase, conversationId);
      return NextResponse.json({ messages });
    }

    const conversations = await listConversations(supabase, session.userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const limit = rateLimit(`ai:${session.userId}`, 20, 60_000);
  if (!limit.allowed) {
    return jsonError(429, "Too many AI requests. Try again shortly.", {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const message = requireString(body, "message", { min: 1, max: 12_000 });
    const providerChoice = typeof body.provider === "string" ? body.provider : undefined;
    const conversationId =
      typeof body.conversationId === "string" && body.conversationId.length > 0
        ? body.conversationId
        : null;

    const provider = resolveProvider(providerChoice);
    if (!provider) {
      return jsonError(503, "No AI provider is configured. Add GEMINI_API_KEY or run Ollama locally.", {
        code: "ai_not_configured",
      });
    }

    const status = await getAccountStatus(session.userId);
    const supabase = await createSupabaseServerClient();

    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId = await createConversation(supabase, session.userId, message.slice(0, 60));
    }

    const history = await listMessages(supabase, activeConversationId);
    await appendMessage(supabase, activeConversationId, "user", message);

    const result = await runAgentTurn({
      userId: session.userId,
      provider,
      history,
      userMessage: message,
      conversationId: activeConversationId,
      connected: status.connected,
      email: status.email,
      providerPreference: providerChoice ?? "auto",
    });

    await appendMessage(supabase, activeConversationId, "assistant", result.reply, {
      provider: result.provider,
      model: result.model,
      pending: result.pending?.actionId ?? null,
    });

    return NextResponse.json({
      conversationId: activeConversationId,
      reply: result.reply,
      provider: result.provider,
      model: result.model,
      executed: result.executed,
      pending: result.pending,
    });
  } catch (error) {
    if (error instanceof Error && /required|invalid|too long|too short/i.test(error.message)) {
      return jsonError(400, error.message);
    }
    return handleError(error);
  }
}