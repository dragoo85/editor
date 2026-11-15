"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpFromLine, Clock, Trash2, UploadCloud } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { formatBytes } from "@/lib/transfer/plan";
import { formatDate } from "@/lib/client/format";
import { useTransferStore } from "@/lib/client/transfers";
import type { TransferRecord } from "@/lib/types";
import { Badge, EmptyState, LoadingBlock, ProgressBar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "danger" | "warning"> = {
  queued: "neutral",
  running: "accent",
  paused: "warning",
  completed: "success",
  failed: "danger",
  canceled: "neutral",
};

export default function UploadsPage() {
  const toast = useToast();
  const items = useTransferStore((state) => state.items);
  const enqueueUpload = useTransferStore((state) => state.enqueueUpload);
  const clearFinished = useTransferStore((state) => state.clearFinished);
  const refreshHistory = useTransferStore((state) => state.refreshHistory);
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploads = items.filter((item) => item.kind === "upload");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiGet<{ transfers: TransferRecord[] }>("/api/transfers?limit=50");
      setHistory((payload.transfers ?? []).filter((transfer) => transfer.kind === "upload"));
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    void refreshHistory();
  }, [loadHistory, refreshHistory]);

  return (
    <div className="space-y-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const files = Array.from(event.dataTransfer.files);
          files.forEach((file) => enqueueUpload(file));
          if (files.length > 0) {
            toast.push({ title: `${files.length} upload(s) queued`, tone: "info" });
            setTimeout(() => void loadHistory(), 1500);
          }
        }}
        className={`panel flex flex-col items-center justify-center gap-3 border-dashed px-6 py-14 text-center transition-colors ${
          dragging ? "border-electric-500/60 bg-electric-500/[0.04]" : ""
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <UploadCloud className="h-5 w-5 text-electric-400" />
        </span>
        <div>
          <h2 className="text-base font-medium text-silver-100">Upload into the GOLIATH folder</h2>
          <p className="mt-1 text-sm text-silver-500">
            Files are uploaded to your own Google Drive with resumable 5 MB chunks, retry and backoff.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            Choose files
          </Button>
          {uploads.length > 0 ? (
            <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={clearFinished}>
              Clear finished
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            files.forEach((file) => enqueueUpload(file));
            event.target.value = "";
            if (files.length > 0) {
              toast.push({ title: `${files.length} upload(s) queued`, tone: "info" });
            }
          }}
        />
      </div>

      <section className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-medium text-silver-200">Active queue</h3>
          <Badge tone={uploads.some((i) => i.status === "running") ? "accent" : "neutral"}>
            {uploads.length} item{uploads.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="p-4">
          {uploads.length === 0 ? (
            <p className="py-6 text-center text-sm text-silver-500">
              No uploads in this session. Completed transfers are listed below.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {uploads.map((item) => {
                const pct = item.size > 0 ? (item.bytesTransferred / item.size) * 100 : 0;
                return (
                  <li key={item.id} className="rounded-xl border border-white/5 bg-graphite-850/60 p-3">
                    <div className="flex items-center gap-2.5">
                      <ArrowUpFromLine className="h-4 w-4 shrink-0 text-electric-400" />
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-silver-200">
                        {item.name}
                      </p>
                      <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status}</Badge>
                    </div>
                    <ProgressBar className="mt-2" value={pct} tone={item.status === "failed" ? "danger" : "accent"} />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-silver-500">
                      <span>
                        {formatBytes(item.bytesTransferred)} / {formatBytes(item.size)}
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
          <h3 className="flex items-center gap-2 text-sm font-medium text-silver-200">
            <Clock className="h-4 w-4 text-silver-500" /> Persisted history
          </h3>
          <Button variant="ghost" onClick={() => void loadHistory()}>
            Refresh
          </Button>
        </div>
        <div className="p-4">
          {loading ? (
            <LoadingBlock label="Loading history" />
          ) : history.length === 0 ? (
            <EmptyState title="No uploads recorded" description="Upload history is stored in Supabase with RLS." />
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