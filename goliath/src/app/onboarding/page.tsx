"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Cloud, HardDrive } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiGet } from "@/lib/client/api";
import { Badge } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/Button";

interface StatusPayload {
  connected: boolean;
  email: string | null;
  configured: boolean;
  reason?: string;
}

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [statusRes, healthRes] = await Promise.all([
          apiGet<StatusPayload>("/api/google/status"),
          apiGet<{ integrations: { ai: string } }>("/api/health"),
        ]);
        setStatus(statusRes);
        setAiConfigured(healthRes.integrations.ai !== "disabled");
      } catch {
        // ignore
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const error = params.get("error");
  const connected = status?.connected ?? false;
  const configured = status?.configured ?? false;

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-electric-500/40 bg-electric-500/10">
          <Cloud className="h-5 w-5 text-electric-400" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-[0.34em] metal-text">GOLIATH</p>
          <p className="text-[11px] text-silver-500">Setup</p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Google reported <code className="rounded bg-black/30 px-1">{error}</code>. Re-authorise from the account
            page to retry.
          </span>
        </div>
      ) : null}

      <ol className="space-y-3">
        <li className="panel flex items-start gap-3 p-4">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs font-semibold text-silver-300">
            1
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium text-silver-100">
              Connect your Google Drive
              {connected ? (
                <Badge tone="success">
                  <CheckCircle2 className="h-3 w-3" /> connected
                </Badge>
              ) : (
                <Badge tone="warning">required</Badge>
              )}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-silver-500">
              GOLIATH creates a dedicated <strong className="text-silver-300">GOLIATH</strong> folder and only writes
              inside it. Listing your other Drive files requires the broader Drive scope requested during consent.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {connected ? (
                <LinkButton href="/dashboard" variant="primary">
                  Continue <ArrowRight className="h-4 w-4" />
                </LinkButton>
              ) : (
                <a href="/api/google/oauth/start" className={configured ? "btn btn-primary" : "btn pointer-events-none opacity-50"}>
                  <Cloud className="h-4 w-4" /> Authorise Google
                </a>
              )}
              <Link href="/settings" className="btn btn-ghost">
                Open settings
              </Link>
            </div>
            {!configured && checked ? (
              <p className="mt-2 text-[11px] text-amber-300/80">{status?.reason}</p>
            ) : null}
          </div>
        </li>

        <li className="panel flex items-start gap-3 p-4">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs font-semibold text-silver-300">
            2
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium text-silver-100">
              Choose an AI provider
              <Badge tone={aiConfigured ? "success" : "neutral"}>{aiConfigured ? "available" : "optional"}</Badge>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-silver-500">
              Add <code className="rounded bg-graphite-800 px-1 py-0.5">GEMINI_API_KEY</code> for Gemini, or point{" "}
              <code className="rounded bg-graphite-800 px-1 py-0.5">OLLAMA_BASE_URL</code> at a local model. AI stays
              read-only until you approve a change.
            </p>
            <div className="mt-3">
              <LinkButton href="/ai">
                <Bot className="h-4 w-4" /> Open AI workspace
              </LinkButton>
            </div>
          </div>
        </li>

        <li className="panel flex items-start gap-3 p-4">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs font-semibold text-silver-300">
            3
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium text-silver-100">
              Start managing files
              <Badge tone="accent">ready</Badge>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-silver-500">
              Upload with resumable chunks, preview, search, star and move files. Everything is backed by the real
              Drive API.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton href="/files" variant="primary">
                <HardDrive className="h-4 w-4" /> File manager
              </LinkButton>
              <LinkButton href="/uploads">
                <ArrowRight className="h-4 w-4" /> Upload manager
              </LinkButton>
            </div>
          </div>
        </li>
      </ol>

      <div className="mt-6 flex justify-center">
        <button type="button" className="text-xs text-silver-500 hover:text-electric-300" onClick={() => router.push("/dashboard")}>
          Skip and go to dashboard
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <Suspense fallback={<p className="text-center text-sm text-silver-500">Loading setup…</p>}>
        <OnboardingInner />
      </Suspense>
    </div>
  );
}