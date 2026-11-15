"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/transfer/plan";
import { useTransferStore, type TransferItem } from "@/lib/client/transfers";
import { ProgressBar, Badge } from "@/components/ui/primitives";
import { IconButton } from "@/components/ui/Button";

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "danger" | "warning"> = {
  queued: "neutral",
  running: "accent",
  paused: "warning",
  completed: "success",
  failed: "danger",
  canceled: "neutral",
};

function Row({ item }: { item: TransferItem }) {
  const pct = item.size > 0 ? (item.bytesTransferred / item.size) * 100 : item.status === "completed" ? 100 : 0;
  return (
    <li className="rounded-xl border border-white/5 bg-graphite-850/70 p-3">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
            item.kind === "upload"
              ? "border-electric-500/30 bg-electric-500/10 text-electric-300"
              : "border-violet-500/30 bg-violet-500/10 text-violet-300",
          )}
        >
          {item.kind === "upload" ? (
            <ArrowUpFromLine className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownToLine className="h-3.5 w-3.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-silver-200">{item.name}</p>
          <p className="mt-0.5 text-[11px] text-silver-500">
            {item.size > 0
              ? `${formatBytes(item.bytesTransferred)} / ${formatBytes(item.size)}`
              : formatBytes(item.bytesTransferred)}
          </p>
        </div>
        <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status}</Badge>
      </div>
      <ProgressBar
        className="mt-2.5"
        value={pct}
        tone={item.status === "failed" ? "danger" : item.status === "completed" ? "success" : "accent"}
      />
      {item.error ? <p className="mt-1.5 line-clamp-2 text-[11px] text-red-300/80">{item.error}</p> : null}
    </li>
  );
}

export function TransferDock() {
  const items = useTransferStore((state) => state.items);
  const clearFinished = useTransferStore((state) => state.clearFinished);
  const retry = useTransferStore((state) => state.retry);
  const cancel = useTransferStore((state) => state.cancel);
  const [open, setOpen] = useState(false);

  const active = items.filter((item) => item.status === "running" || item.status === "queued");
  const recent = items.slice(0, 12);
  const failed = items.filter((item) => item.status === "failed");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Transfer manager"
        className={cn(
          "relative inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors",
          active.length > 0
            ? "border-electric-500/40 bg-electric-500/10 text-electric-300"
            : "border-white/10 bg-white/[0.03] text-silver-400 hover:text-white",
        )}
      >
        <ArrowUpFromLine className="h-4 w-4" />
        <span className="hidden sm:inline">Transfers</span>
        {active.length > 0 ? (
          <span className="rounded-full bg-electric-500/20 px-1.5 text-[10px] font-semibold text-electric-200">
            {active.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,24rem)] animate-rise-in rounded-2xl border border-white/10 bg-graphite-900/98 p-3 shadow-panel backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-silver-500">Transfers</p>
            <div className="flex items-center gap-1">
              <IconButton label="Retry all failed" onClick={() => failed.forEach((item) => retry(item.id))}>
                <ChevronDown className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label="Clear finished" onClick={clearFinished}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label="Close transfer manager" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>

          {recent.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-silver-500">
              No transfers yet. Drop files into the file manager to start one.
            </p>
          ) : (
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {recent.map((item) => (
                <div key={item.id} className="relative">
                  <Row item={item} />
                  {(item.status === "failed" || item.status === "paused") && (
                    <button
                      type="button"
                      onClick={() => retry(item.id)}
                      className="mt-1.5 text-[11px] font-medium text-electric-300 hover:text-electric-200"
                    >
                      Retry
                    </button>
                  )}
                  {item.status === "running" && (
                    <button
                      type="button"
                      onClick={() => cancel(item.id)}
                      className="mt-1.5 text-[11px] font-medium text-silver-500 hover:text-red-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}