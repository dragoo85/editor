"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Download, FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge, LoadingBlock } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/transfer/plan";
import { formatDate, fileVisual } from "@/lib/client/format";
import { useTransferStore } from "@/lib/client/transfers";
import type { DriveItem } from "@/lib/types";

function isPreviewableImage(mime: string): boolean {
  return mime.startsWith("image/") && !mime.includes("svg");
}

export function PreviewModal({
  item,
  onClose,
}: {
  item: DriveItem | null;
  onClose: () => void;
}) {
  const enqueueDownload = useTransferStore((state) => state.enqueueDownload);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isText = item ? item.mimeType.startsWith("text/") || item.mimeType.includes("json") : false;
  const isPdf = item?.mimeType === "application/pdf";
  const inlineUrl = item ? `/api/drive/download?fileId=${item.id}&disposition=inline` : "";

  useEffect(() => {
    setText(null);
    setError(null);
    if (!item || !isText) return;

    let cancelled = false;
    setLoading(true);
    fetch(inlineUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Preview failed (${response.status})`);
        return response.text();
      })
      .then((value) => {
        if (!cancelled) setText(value.slice(0, 400_000));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item, isText, inlineUrl]);

  if (!item) return null;
  const { Icon, className } = fileVisual(item);

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      size="lg"
      title={item.name}
      description={`${item.mimeType} · ${formatBytes(item.size)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            icon={<Download className="h-4 w-4" />}
            onClick={() => enqueueDownload(item)}
          >
            Download
          </Button>
          {item.webViewLink ? (
            <a href={item.webViewLink} target="_blank" rel="noreferrer" className="btn btn-primary">
              <ExternalLink className="h-4 w-4" /> Open in Drive
            </a>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">
            <Icon className={cn("h-3.5 w-3.5", className)} />
            {item.kind}
          </Badge>
          <Badge>{formatDate(item.modifiedTime)}</Badge>
          {item.shared ? <Badge tone="warning">shared</Badge> : null}
          {item.starred ? <Badge tone="warning">starred</Badge> : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/5 bg-graphite-950/70">
          {isPreviewableImage(item.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inlineUrl} alt={item.name} className="max-h-[60vh] w-full object-contain" />
          ) : isPdf ? (
            <iframe src={`${inlineUrl}#toolbar=0`} title={item.name} className="h-[60vh] w-full" />
          ) : isText ? (
            loading ? (
              <LoadingBlock label="Extracting text" />
            ) : error ? (
              <p className="p-4 text-sm text-red-300">{error}</p>
            ) : (
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-silver-300">
                {text ?? ""}
              </pre>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <FileText className="h-8 w-8 text-silver-600" />
              <p className="text-sm text-silver-400">No inline preview for this file type.</p>
              <p className="text-xs text-silver-600">Download it or open it in Google Drive.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}