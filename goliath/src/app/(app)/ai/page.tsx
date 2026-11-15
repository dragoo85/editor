"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, Send, ShieldAlert, Sparkles, X } from "lucide-react";
import { apiGet, apiSend, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { Badge, LoadingBlock } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

interface PendingAction {
  actionId: string;
  spec: { action: string; [key: string]: unknown };
  explanation: string;
}

interface ProviderInfo {
  name: string;
  available: boolean;
  model: string;
}

const SUGGESTIONS = [
  "Find every PDF in my Drive",
  "Summarise the most recent text file",
  "Show metadata for the files in GOLIATH",
  "Which files are largest?",
];

export default function AiPage() {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const payload = await apiGet<{ provider: ProviderInfo; logs: Record<string, unknown>[] }>(
          "/api/ai/logs",
        );
        setProvider(payload.provider);
        setLogs(payload.logs ?? []);
      } catch {
        // provider info is optional chrome
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || busy) return;
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);

    try {
      const payload = await apiSend<{
        reply: string;
        conversationId: string;
        pending: PendingAction | null;
        provider: string;
      }>("/api/ai", { message: trimmed, conversationId });
      setConversationId(payload.conversationId);
      setMessages((current) => [...current, { role: "assistant", content: payload.reply }]);
      if (payload.pending) setPending(payload.pending);
    } catch (error) {
      const message = errorMessage(error);
      setMessages((current) => [...current, { role: "assistant", content: `Request failed: ${message}` }]);
      toast.push({ title: "AI request failed", description: message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "confirm" | "deny") {
    if (!pending) return;
    const actionId = pending.actionId;
    setPending(null);
    setBusy(true);
    try {
      const payload = await apiSend<{ reply: string }>("/api/ai/confirm", {
        actionId,
        decision,
        conversationId,
      });
      setMessages((current) => [...current, { role: "assistant", content: payload.reply }]);
      toast.push({
        title: decision === "confirm" ? "Action applied" : "Action denied",
        tone: decision === "confirm" ? "success" : "info",
      });
    } catch (error) {
      toast.push({ title: "Confirmation failed", description: errorMessage(error), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <section className="panel flex h-[calc(100vh-11rem)] flex-col">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-electric-500/40 bg-electric-500/10">
              <Bot className="h-4 w-4 text-electric-400" />
            </span>
            <div>
              <h3 className="text-sm font-medium text-silver-100">GOLIATH AI</h3>
              <p className="text-[11px] text-silver-500">
                {provider?.available ? `${provider.name} · ${provider.model}` : "no provider configured"}
              </p>
            </div>
          </div>
          <Badge tone={provider?.available ? "success" : "danger"}>
            {provider?.available ? "read-only by default" : "offline"}
          </Badge>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-md text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                <Sparkles className="h-5 w-5 text-electric-400" />
              </span>
              <h4 className="mt-4 text-base font-medium metal-text">Ask about your Drive</h4>
              <p className="mt-1.5 text-sm text-silver-500">
                GOLIATH AI can search, read metadata and text, summarise documents and propose file
                operations. Anything that changes a file waits for your confirmation.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="chip hover:border-electric-500/40 hover:text-electric-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn("flex gap-2.5", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" ? (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-electric-500/30 bg-electric-500/10">
                    <Bot className="h-3.5 w-3.5 text-electric-300" />
                  </span>
                ) : null}
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-electric-500/15 text-silver-100"
                      : "border border-white/5 bg-graphite-850/80 text-silver-300",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}

          {busy ? <LoadingBlock label="Thinking" /> : null}

          {pending ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
              <p className="flex items-center gap-2 text-xs font-medium text-amber-200">
                <ShieldAlert className="h-4 w-4" /> Confirmation required: {pending.spec.action}
              </p>
              <p className="mt-1 text-xs text-amber-100/70">{pending.explanation}</p>
              <div className="mt-2.5 flex gap-2">
                <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={() => void decide("confirm")}>
                  Approve and run
                </Button>
                <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => void decide("deny")}>
                  Deny
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <form
          className="border-t border-white/5 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              placeholder="Ask about your files, or request a change…"
              className="input min-h-[3.25rem] resize-none py-2.5"
            />
            <Button type="submit" variant="primary" loading={busy} icon={<Send className="h-4 w-4" />}>
              Send
            </Button>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="panel p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-silver-500">Safety model</h4>
          <ul className="mt-2.5 space-y-2 text-xs text-silver-400">
            <li>Read-only unless you approve a mutation.</li>
            <li>Delete and share always require confirmation.</li>
            <li>Every action is written to the agent log.</li>
            <li>No access to files outside your Drive.</li>
          </ul>
        </div>

        <div className="panel p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-silver-500">Recent agent actions</h4>
          {logs.length === 0 ? (
            <p className="mt-2 text-xs text-silver-500">No actions logged yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {logs.slice(0, 8).map((entry, index) => (
                <li key={index} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-silver-300">{String(entry.action ?? "action")}</span>
                  <span className="shrink-0 text-silver-600">{String(entry.status ?? "")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}