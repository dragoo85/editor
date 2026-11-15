"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, DownloadCloud } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { formatBytes } from "@/lib/transfer/plan";
import { formatDate } from "@/lib/client/format";
import { useTransferStore } from "@/lib/client/transfers";
import type { TransferRecord } from "@/lib/types";
import { Badge, EmptyState, ErrorState, LoadingBlock, ProgressBar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "danger" | "warning"> = {
  queued: "neutral",
  running: "accent",
  paused: "warning",
  completed: "success",
  failed: "danger",
  canceled: "neutral",
};

export default function DownloadsPage() {
  const items = useTransferStore((state) => state.items);
  const clearFinished = useTransferStore((state) => state.clearFinished);
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const downloads = items.filter((item) => item.kind === "download");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGet<{ transfers: TransferRecord[] }>("/api/transfers?limit=50");
      setHistory((payload.transfers ?? []).filter((transfer) => transfer.kind === "download"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load download history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <div className="space-y-5">
      <section className="panel">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-sm font-medium text-silver-200">
            <DownloadCloud className="h-4 w-4 text-silver-500" /> Session downloads
          </h3>
          <div className="flex items-center gap-2">
            <Badge tone={downloads.some((i) => i.status === "running") ? "accent" : "neutral"}>
              {downloads.length} item{downloads.length === 1 ? "" : "s"}
            </Badge>
            <Button variant="ghost" onClick={clearFinished}>
              Clear
            </Button>
          </div>
        </div>
        <div className="p-4">
          {downloads.length === 0 ? (
            <EmptyState
              title="No downloads started"
              description="Download a file from the file manager, search results or a preview to see it here."
            />
          ) : (
            <ul className="space-y-2.5">
              {downloads.map((item) => {
                const pct = item.size > 0 ? (item.bytesTransferred / item.size) * 100 : 0;
                return (
                  <li key={item.id} className="rounded-xl border border-white/5 bg-graphite-850/60 p-3">
                    <div className="flex items-center gap-2.5">
                      <ArrowDownToLine className="h-4 w-4 shrink-0 text-violet-300" />
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-silver-200">
                        {item.name}
                      </p>
                      <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status}</Badge>
                    </div>
                    <ProgressBar
                      className="mt-2"
                      value={pct}
                      tone={item.status === "failed" ? "danger" : item.status === "completed" ? "success" : "accent"}
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-silver-500">
                      <span>
                        {formatBytes(item.bytesTransferred)}
                        {item.size > 0 ? ` / ${formatBytes(item.size)}` : ""}
                      </span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    {item.error ? <p className="mt-1 text-[11px] text-red-300/80">{item.error}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-medium text-silver-200">Download history</h3>
          <Button variant="ghost" onClick={() => void loadHistory()}>
            Refresh
          </Button>
        </div>
        <div className="p-4">
          {loading ? (
            <LoadingBlock label="Loading history" />
          ) : error ? (
            <ErrorState title="Could not load history" description={error} onRetry={() => void loadHistory()} />
          ) : history.length === 0 ? (
            <EmptyState title="No downloads recorded" description="Downloads are logged server-side when they start." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-silver-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Size</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((transfer) => (
                    <tr key={transfer.id} className="border-t border-white/5">
                      <td className="max-w-[16rem] truncate py-2 pr-4 text-silver-200">{transfer.name}</td>
                      <td className="py-2 pr-4 text-silver-500">{formatBytes(transfer.size)}</td>
                      <td className="py-2 pr-4">
                        <Badge tone={STATUS_TONE[transfer.status] ?? "neutral"}>{transfer.status}</Badge>
                      </td>
                      <td className="py-2 text-silver-500">{formatDate(transfer.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}