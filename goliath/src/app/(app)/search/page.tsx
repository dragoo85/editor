"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { fileVisual, formatRelativeTime } from "@/lib/client/format";
import { formatBytes } from "@/lib/transfer/plan";
import type { DriveItem } from "@/lib/types";
import { Badge, EmptyState, ErrorState, LoadingBlock } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PreviewModal } from "@/components/files/PreviewModal";
import { useTransferStore } from "@/lib/client/transfers";

function SearchInner() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [results, setResults] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DriveItem | null>(null);
  const enqueueDownload = useTransferStore((state) => state.enqueueDownload);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const run = useCallback(async (value: string) => {
    if (value.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGet<{ items: DriveItem[] }>(
        `/api/drive/search?q=${encodeURIComponent(value)}`,
      );
      setResults(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run(debounced);
  }, [debounced, run]);

  return (
    <div className="space-y-5">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void run(query.trim());
        }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-silver-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names and content across Drive…"
            className="input pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" variant="primary" loading={loading}>
          Search
        </Button>
      </form>

      <p className="text-xs text-silver-500">
        {debounced.length < 2
          ? "Type at least 2 characters. Search uses Drive fullText, so it covers file contents too."
          : `${results.length} result${results.length === 1 ? "" : "s"} for "${debounced}"`}
      </p>

      {loading ? (
        <LoadingBlock label="Searching Drive" />
      ) : error ? (
        <ErrorState title="Search failed" description={error} onRetry={() => void run(debounced)} />
      ) : results.length === 0 && debounced.length >= 2 ? (
        <EmptyState title="No matches" description="Try a different term or search by file type." />
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-white/5">
            {results.map((item) => {
              const { Icon, className } = fileVisual(item);
              return (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon className={`h-4 w-4 shrink-0 ${className}`} />
                  <button
                    type="button"
                    onClick={() => setPreview(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm text-silver-200 hover:text-white">{item.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-silver-500">
                      {item.mimeType} · {item.kind === "folder" ? "Folder" : formatBytes(item.size)} ·{" "}
                      {formatRelativeTime(item.modifiedTime)}
                    </p>
                  </button>
                  {item.starred ? <Badge tone="warning">starred</Badge> : null}
                  <Button
                    variant="ghost"
                    onClick={() => enqueueDownload(item)}
                    disabled={item.kind === "folder"}
                  >
                    Download
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <PreviewModal item={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Preparing search" />}>
      <SearchInner />
    </Suspense>
  );
}