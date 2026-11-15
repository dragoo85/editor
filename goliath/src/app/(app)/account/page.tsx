"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Cloud,
  CloudOff,
  ExternalLink,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { apiGet, apiSend, errorMessage } from "@/lib/client/api";
import { formatBytes } from "@/lib/transfer/plan";
import { formatDate } from "@/lib/client/format";
import type { GoogleAccountStatus } from "@/lib/types";
import { Badge, EmptyState, ErrorState, LoadingBlock, ProgressBar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface AboutPayload {
  limitBytes: number;
  usedBytes: number;
  usedInTrashBytes: number;
  freeBytes: number;
  usedLabel: string;
  freeLabel: string;
  limitLabel: string;
}

interface LogEntry {
  id: string;
  action: string;
  target: string;
  status: string;
  requires_confirmation: boolean;
  created_at: string;
}

export default function AccountPage() {
  const toast = useToast();
  const [status, setStatus] = useState<GoogleAccountStatus | null>(null);
  const [about, setAbout] = useState<AboutPayload | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await apiGet<GoogleAccountStatus>("/api/google/status");
      setStatus(statusRes);

      if (statusRes.connected) {
        try {
          setAbout(await apiGet<AboutPayload>("/api/drive/about"));
        } catch {
          setAbout(null);
        }
      }

      try {
        const payload = await apiGet<{ logs: LogEntry[] }>("/api/ai/logs");
        setLogs(payload.logs ?? []);
      } catch {
        setLogs([]);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function disconnect() {
    setBusy(true);
    try {
      await apiSend("/api/google/disconnect", {});
      toast.push({ title: "Google account disconnected", tone: "success" });
      await load();
    } catch (err) {
      toast.push({ title: "Disconnect failed", description: errorMessage(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading account" />;
  if (error) return <ErrorState title="Account unavailable" description={error} onRetry={() => void load()} />;

  const usedPct = about && about.limitBytes > 0 ? (about.usedBytes / about.limitBytes) * 100 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-silver-100">
                {status?.connected ? (
                  <Cloud className="h-4 w-4 text-emerald-400" />
                ) : (
                  <CloudOff className="h-4 w-4 text-amber-400" />
                )}
                Google Drive
              </h3>
              <p className="mt-1 text-xs text-silver-500">
                {status?.connected
                  ? `Connected as ${status.email ?? "unknown account"}`
                  : status?.configured === false
                    ? "Google OAuth is not configured on this deployment"
                    : "No Google account connected"}
              </p>
            </div>
            <Badge tone={status?.connected ? "success" : "warning"}>
              {status?.connected ? "connected" : "disconnected"}
            </Badge>
          </div>

          {status?.reason ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {status.reason}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {status?.connected ? (
              <Button variant="danger" icon={<Unplug className="h-4 w-4" />} loading={busy} onClick={() => void disconnect()}>
                Disconnect
              </Button>
            ) : (
              <a
                href="/api/google/oauth/start"
                className={status?.configured === false ? "btn pointer-events-none opacity-50" : "btn btn-primary"}
              >
                <KeyRound className="h-4 w-4" /> Connect Google Drive
              </a>
            )}
            <Button variant="ghost" icon={<ExternalLink className="h-4 w-4" />} onClick={() => void load()}>
              Refresh status
            </Button>
          </div>

          <dl className="mt-5 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-graphite-950/50 p-3">
              <dt className="text-silver-500">GOLIATH folder id</dt>
              <dd className="mt-0.5 truncate font-mono text-[11px] text-silver-300">
                {status?.driveRootId ?? "—"}
              </dd>
            </div>
            <div className="rounded-lg border border-white/5 bg-graphite-950/50 p-3">
              <dt className="text-silver-500">Last metadata sync</dt>
              <dd className="mt-0.5 text-silver-300">{formatDate(status?.lastSyncedAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-silver-100">
            <HardDrive className="h-4 w-4 text-silver-500" /> Storage
          </h3>
          {about ? (
            <>
              <div className="mt-3 flex items-center justify-between text-xs text-silver-500">
                <span>{about.usedLabel} used</span>
                <span>{about.limitLabel} limit</span>
              </div>
              <ProgressBar className="mt-2" value={usedPct} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Used", about.usedLabel],
                  ["Free", about.freeLabel],
                  ["Trash", formatBytes(about.usedInTrashBytes)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/5 bg-graphite-950/50 p-2.5">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-silver-500">{label}</p>
                    <p className="mt-0.5 text-xs text-silver-200">{value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-silver-500">Connect Drive to read storage usage.</p>
          )}
        </section>

        <section className="panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-silver-100">
            <KeyRound className="h-4 w-4 text-silver-500" /> Granted scopes
          </h3>
          {status?.scopes?.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {status.scopes.map((scope) => (
                <li key={scope} className="chip normal-case tracking-normal">
                  {scope}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-silver-500">No scopes granted yet.</p>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-silver-100">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Security
          </h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-silver-400">
            <li>Refresh tokens are encrypted at rest with AES-256-GCM and never sent to the browser.</li>
            <li>OAuth uses PKCE (S256) plus a state cookie bound to your session.</li>
            <li>Supabase Row Level Security restricts every table to your own user id.</li>
            <li>Service-role keys are only read in server code; the browser only ever sees the anon key.</li>
            <li>Uploads run through authenticated API routes with per-user rate limits on AI endpoints.</li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3 className="text-sm font-medium text-silver-100">Agent action log</h3>
            <Badge>{logs.length}</Badge>
          </div>
          <div className="p-4">
            {logs.length === 0 ? (
              <EmptyState title="No agent actions" description="Actions taken by GOLIATH AI appear here with their status." />
            ) : (
              <ul className="space-y-1.5">
                {logs.slice(0, 15).map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate text-silver-300">
                      {entry.action} <span className="text-silver-600">·</span> {entry.target}
                    </span>
                    <Badge
                      tone={
                        entry.status === "executed" || entry.status === "confirmed"
                          ? "success"
                          : entry.status === "failed"
                            ? "danger"
                            : entry.status === "pending"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}