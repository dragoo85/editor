import { appendMessage, logAgentAction } from "../db/repositories";
import { createSupabaseServerClient } from "../supabase/server";
import type { ChatMessage } from "../types";
import { buildSystemPrompt } from "./prompts";
import { executeAgentAction } from "./tools";
import { MUTATING_ACTIONS, type AgentActionSpec, type AiProvider } from "./types";

const ACTION_BLOCK = /```goliath-action\s*([\s\S]*?)```/i;
const VALID_ACTIONS = new Set([
  "search",
  "read_metadata",
  "read_text",
  "summarize",
  "rename",
  "move",
  "copy",
  "trash",
  "star",
]);

export interface PendingAction {
  actionId: string;
  spec: AgentActionSpec;
  explanation: string;
}

export interface AgentTurnResult {
  reply: string;
  provider: string;
  model: string;
  executed: boolean;
  pending: PendingAction | null;
}

export function parseActionBlock(text: string): AgentActionSpec | null {
  const match = ACTION_BLOCK.exec(text);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as Partial<AgentActionSpec>;
    if (!parsed.action || !VALID_ACTIONS.has(parsed.action)) return null;
    return {
      action: parsed.action as AgentActionSpec["action"],
      ...(typeof parsed.query === "string" ? { query: parsed.query.slice(0, 512) } : {}),
      ...(Array.isArray(parsed.fileIds)
        ? { fileIds: parsed.fileIds.filter((id) => typeof id === "string").slice(0, 10) }
        : {}),
      ...(typeof parsed.name === "string" ? { name: parsed.name.slice(0, 255) } : {}),
      ...(typeof parsed.targetFolderId === "string" ? { targetFolderId: parsed.targetFolderId } : {}),
      ...(typeof parsed.currentFolderId === "string" ? { currentFolderId: parsed.currentFolderId } : {}),
      ...(typeof parsed.parentId === "string" ? { parentId: parsed.parentId } : {}),
      ...(typeof parsed.starred === "boolean" ? { starred: parsed.starred } : {}),
    };
  } catch {
    return null;
  }
}

export function stripActionBlock(text: string): string {
  return text.replace(ACTION_BLOCK, "").trim();
}

export async function runAgentTurn({
  userId,
  provider,
  history,
  userMessage,
  conversationId,
  connected,
  email,
  providerPreference,
}: {
  userId: string;
  provider: AiProvider;
  history: ChatMessage[];
  userMessage: string;
  conversationId: string | null;
  connected: boolean;
  email: string | null;
  providerPreference: string;
}): Promise<AgentTurnResult> {
  const supabase = await createSupabaseServerClient();
  const system = buildSystemPrompt({ connected, email, provider: provider.name });

  const messages = [
    { role: "system" as const, content: system },
    ...history
      .filter((m) => m.role !== "tool" && m.content.trim().length > 0)
      .slice(-12)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  if (!connected) {
    return {
      reply:
        "Google Drive is not connected, so I cannot search or read any files yet. Open Settings and connect your Google account first.",
      provider: provider.name,
      model: provider.model,
      executed: false,
      pending: null,
    };
  }

  const first = await provider.complete({ messages, temperature: 0.35, maxOutputTokens: 2048 });
  const spec = parseActionBlock(first.text);
  const visible = stripActionBlock(first.text);

  if (!spec) {
    return { reply: visible || first.text, provider: provider.name, model: provider.model, executed: false, pending: null };
  }

  const mutating = MUTATING_ACTIONS.has(spec.action);

  if (mutating) {
    const inserted = await supabase
      .from("agent_action_logs")
      .insert({
        user_id: userId,
        action: spec.action,
        target: spec.fileIds?.[0] ?? spec.query ?? "-",
        status: "pending",
        requires_confirmation: true,
        details: { spec },
      })
      .select("id")
      .single();

    return {
      reply: `${visible}\n\nI need your confirmation before applying this change.`,
      provider: provider.name,
      model: provider.model,
      executed: false,
      pending: {
        actionId: (inserted.data as { id: string } | null)?.id ?? "",
        spec,
        explanation: visible,
      },
    };
  }

  const result = await executeAgentAction({
    userId,
    spec,
    provider,
    confirmed: true,
  });

  if (conversationId) {
    await logAgentAction(supabase, userId, {
      action: spec.action,
      target: spec.fileIds?.[0] ?? spec.query ?? "-",
      status: result.ok ? "executed" : "failed",
      requiresConfirmation: false,
      details: result.details,
    });
  }

  const followUp = await provider.complete({
    messages: [
      ...messages,
      { role: "assistant", content: `${visible}\n\n[action result] ${result.summary}` },
      {
        role: "user",
        content: `The action "${spec.action}" returned:\n${result.summary}\n\nExplain the result to the user in 1-3 sentences. Do not repeat raw data dumps.`,
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 800,
  });

  if (conversationId && result.ok) {
    await appendMessage(supabase, conversationId, "tool", result.summary, {
      action: spec.action,
      ...result.details,
    });
  }

  return {
    reply: followUp.text,
    provider: provider.name,
    model: provider.model,
    executed: result.ok,
    pending: null,
  };
}

export async function confirmPendingAction({
  userId,
  actionId,
  provider,
}: {
  userId: string;
  actionId: string;
  provider: AiProvider;
}): Promise<{ ok: boolean; reply: string }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("agent_action_logs")
    .select("id,action,target,status,requires_confirmation,details")
    .eq("id", actionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return { ok: false, reply: "That confirmation request no longer exists." };

  const row = data as {
    id: string;
    action: string;
    target: string;
    status: string;
    requires_confirmation: boolean;
    details: { spec?: AgentActionSpec } | null;
  };

  if (row.status !== "pending") {
    return { ok: false, reply: `This action was already ${row.status}.` };
  }
  if (!row.details?.spec) {
    return { ok: false, reply: "The stored action payload is missing; ask me to prepare it again." };
  }

  const result = await executeAgentAction({ userId, spec: row.details.spec, provider, confirmed: true });

  await supabase
    .from("agent_action_logs")
    .update({ status: result.ok ? "executed" : "failed", details: { ...row.details, result: result.details } })
    .eq("id", actionId);

  return {
    ok: result.ok,
    reply: result.ok ? `Done. ${result.summary}` : `Action failed. ${result.summary}`,
  };
}

export async function denyPendingAction({
  userId,
  actionId,
}: {
  userId: string;
  actionId: string;
}): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("agent_action_logs")
    .update({ status: "denied" })
    .eq("id", actionId)
    .eq("user_id", userId);
  return { ok: !error };
}