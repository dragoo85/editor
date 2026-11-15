"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Cloud,
  CloudCog,
  Database,
  FolderOpen,
  HardDrive,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { formatBytes } from "@/lib/transfer/plan";
import { fileVisual, formatRelativeTime } from "@/lib/client/format";
import type { DriveItem, GoogleAccountStatus } from "@/lib/types";
import { Badge, EmptyState, ErrorState, LoadingBlock, ProgressBar } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/Button";
import { useTransferStore } from "@/lib/client/transfers";

interface AboutPayload {
  limitBytes: number;
  usedBytes: number;
  usedInTrashBytes: number;
  freeBytes: number;
  usedLabel: string;
  freeLabel: string;
}

export default function DashboardPage() {
  const [status, setStatus] = useState<GoogleAccountStatus | null>(null);
  const [about, setAbout] = useState<AboutPayload | null>(null);
  const [recent, setRecent] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const items = useTransferStore((state) => state.items);
  const active = items.filter((item) => item.status === "running" || item.status === "queued");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, recentRes] = await Promise.all([
        fetch("/api/google/status", { cache: "no-store" }),
        fetch("/api/drive/recent?limit=6", { cache: "no-store" }),
      ]);
      const statusPayload = (await statusRes.json()) as GoogleAccountStatus;
      setStatus(statusPayload);

      if (statusPayload.connected) {
        const aboutRes = await fetch("/api/drive/about", { cache: "no-store" });
        if (aboutRes.ok) setAbout((await aboutRes.json()) as AboutPayload);
      }

      if (recentRes.ok) {
        const recentPayload = (await recentRes.json()) as { items: DriveItem[] };
        setRecent(recentPayload.items ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingBlock label="Loading workspace" />;
  if (error) return <ErrorState title="Dashboard unavailable" description={error} onRetry={() => void load()} />;

  const usedPct = about && about.limitBytes > 0 ? (about.usedBytes / about.limitBytes) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-graphite-sheen" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <Badge tone={status?.connected ? "success" : "warning"}>
                <Cloud className="h-3.5 w-3.5" />
                {status?.connected ? "Drive connected" : status?.configured === false ? "Not configured" : "Not connected"}
              </Badge>
              <Badge tone="accent">
                <ShieldCheck className="h-3.5 w-3.5" /> RLS protected
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight metal-text">
              Your Drive, rebuilt around you
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-silver-400">
              GOLIATH keeps your files in your own Google Drive and adds a real file manager,
              resumable transfers, metadata sync and an AI workspace that never touches a file
              without your confirmation.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {status?.connected ? (
                <>
                  <LinkButton href="/files" variant="primary">
                    <FolderOpen className="h-4 w-4" /> Open file manager
                  </LinkButton>
                  <LinkButton href="/uploads">
                    <UploadCloud className="h-4 w-4" /> Upload files
                  </LinkButton>
                </>
              ) : (
                <LinkButton href="/account" variant="primary">
                  <CloudCog className="h-4 w-4" />
                  {status?.configured === false ? "Configure Google OAuth" : "Connect Google Drive"}
                </LinkButton>
              )}
              <LinkButton href="/ai" variant="ghost">
                <Bot className="h-4 w-4" /> AI workspace
              </LinkButton>
            </div>
            {status?.reason ? <p className="mt-3 text-xs text-amber-300/80">{status.reason}</p> : null}
          </div>

          <div className="w-full max-w-xs rounded-xl border border-white/5 bg-graphite-950/60 p-4">
            <div className="flex items-center justify-between text-xs text-silver-500">
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" /> Drive storage
              </span>
              <span>{about ? `${usedPct.toFixed(1)}%` : "—"}</span>
            </div>
            <ProgressBar className="mt-2" value={usedPct} />
            <dl className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-silver-500">Used</dt>
                <dd className="text-silver-200">{about?.usedLabel ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-silver-500">Free</dt>
                <dd className="text-silver-200">{about?.freeLabel ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-silver-500">Limit</dt>
                <dd className="text-silver-200">
                  {about ? (about.limitBytes ? formatBytes(about.limitBytes) : "No cap") : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Active transfers",
            value: String(active.length),
            hint: "uploads + downloads in flight",
            Icon: UploadCloud,
          },
          {
            label: "Recent items",
            value: String(recent.length),
            hint: "from your metadata cache",
            Icon: Database,
          },
          {
            label: "Account",
            value: status?.email ? status.email.split("@")[0] : "Not linked",
            hint: status?.scopes?.length ? `${status.scopes.length} scopes granted` : "awaiting OAuth",
            Icon: Cloud,
          },
          {
            label: "AI provider",
            value: status?.connected ? "ready" : "idle",
            hint: "Gemini or local Ollama",
            Icon: Bot,
          },
        ].map(({ label, value, hint, Icon }) => (
          <div key={label} className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-silver-500">{label}</p>
              <Icon className="h-4 w-4 text-silver-600" />
            </div>
            <p className="mt-2 truncate text-lg font-medium text-silver-100">{value}</p>
            <p className="mt-0.5 text-[11px] text-silver-500">{hint}</p>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-medium text-silver-200">Recently modified</h3>
          <Link href="/recent" className="inline-flex items-center gap-1 text-xs text-electric-300 hover:text-electric-200">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-4">
          {recent.length === 0 ? (
            <EmptyState
              title="Nothing synced yet"
              description="Open the file manager to sync your GOLIATH folder metadata from Drive."
              action={
                <LinkButton href="/files" variant="primary">
                  Open file manager
                </LinkButton>
              }
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map((item) => {
                const { Icon, className } = fileVisual(item);
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${className}`} />
                    <span className="min-w-0 flex-1 truncate text-sm text-silver-200">{item.name}</span>
                    <span className="hidden text-xs text-silver-500 sm:block">
                      {item.kind === "folder" ? "Folder" : formatBytes(item.size)}
                    </span>
                    <span className="text-xs text-silver-500">{formatRelativeTime(item.modifiedTime)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}