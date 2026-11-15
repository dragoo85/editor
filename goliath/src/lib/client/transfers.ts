"use client";

import { create } from "zustand";
import { apiSend, errorMessage } from "./api";
import { backoffDelay } from "@/lib/transfer/plan";
import type { DriveItem, TransferKind, TransferRecord, TransferStatus } from "@/lib/types";

export interface TransferItem {
  id: string;
  serverId: string | null;
  kind: TransferKind;
  name: string;
  mimeType: string;
  size: number;
  bytesTransferred: number;
  chunkSize: number;
  status: TransferStatus;
  error: string | null;
  createdAt: string;
  driveFileId: string | null;
  /** In-memory only: a File cannot be persisted, so resume works within the session. */
  file?: File;
}

interface InitResponse {
  transferId: string;
  chunkSize: number;
  totalChunks: number;
}

interface ChunkResponse {
  status: "progress" | "completed";
  bytesReceived: number;
  fileId: string | null;
}

interface TransferState {
  items: TransferItem[];
  history: TransferRecord[];
  hydrated: boolean;
  enqueueUpload: (file: File, parentId?: string) => void;
  enqueueDownload: (item: DriveItem) => void;
  enqueueDownloadById: (fileId: string, name: string) => void;
  pause: (id: string) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  clearFinished: () => void;
  refreshHistory: () => Promise<void>;
  patch: (id: string, patch: Partial<TransferItem>) => void;
}

const MAX_UPLOAD_RETRIES = 5;
const CONCURRENT_UPLOADS = 2;
const CONCURRENT_DOWNLOADS = 3;

let uploadActive = 0;
let downloadActive = 0;
const controllers = new Map<string, { canceled: boolean; paused: boolean }>();

function newId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useTransferStore = create<TransferState>((set, get) => ({
  items: [],
  history: [],
  hydrated: false,

  patch: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),

  enqueueUpload: (file, parentId) => {
    const id = newId();
    const item: TransferItem = {
      id,
      serverId: null,
      kind: "upload",
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      bytesTransferred: 0,
      chunkSize: 0,
      status: "queued",
      error: null,
      createdAt: new Date().toISOString(),
      driveFileId: null,
      file,
    };
    controllers.set(id, { canceled: false, paused: false });
    set((state) => ({ items: [item, ...state.items] }));
    pumpUploads();
  },

  enqueueDownload: (item) => {
    get().enqueueDownloadById(item.id, item.name);
  },

  enqueueDownloadById: (fileId, name) => {
    const id = newId();
    const entry: TransferItem = {
      id,
      serverId: null,
      kind: "download",
      name,
      mimeType: "application/octet-stream",
      size: 0,
      bytesTransferred: 0,
      chunkSize: 0,
      status: "queued",
      error: null,
      createdAt: new Date().toISOString(),
      driveFileId: fileId,
    };
    controllers.set(id, { canceled: false, paused: false });
    set((state) => ({ items: [entry, ...state.items] }));
    pumpDownloads();
  },

  pause: (id) => {
    const control = controllers.get(id);
    if (control) control.paused = true;
    get().patch(id, { status: "paused" });
  },

  cancel: (id) => {
    const control = controllers.get(id);
    if (control) control.canceled = true;
    const item = get().items.find((entry) => entry.id === id);
    get().patch(id, { status: "canceled" });
    if (item?.serverId) {
      void apiSend("/api/drive/upload/cancel", { transferId: item.serverId }).catch(() => undefined);
    }
  },

  retry: (id) => {
    const item = get().items.find((entry) => entry.id === id);
    if (!item) return;
    const control = controllers.get(id);
    if (control) {
      control.canceled = false;
      control.paused = false;
    }
    get().patch(id, { status: "queued", error: null });
    if (item.kind === "upload") pumpUploads();
    else pumpDownloads();
  },

  clearFinished: () =>
    set((state) => ({
      items: state.items.filter(
        (item) => item.status === "queued" || item.status === "running" || item.status === "paused",
      ),
    })),

  refreshHistory: async () => {
    try {
      const response = await fetch("/api/transfers?limit=50", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { transfers: TransferRecord[] };
      set({ history: payload.transfers ?? [], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));

/* ------------------------------ upload pump ----------------------------- */

function pumpUploads(): void {
  const { items } = useTransferStore.getState();
  const queued = items.filter((item) => item.kind === "upload" && item.status === "queued");
  for (const item of queued) {
    if (uploadActive >= CONCURRENT_UPLOADS) return;
    uploadActive += 1;
    useTransferStore.getState().patch(item.id, { status: "running" });
    void runUpload(item).finally(() => {
      uploadActive = Math.max(0, uploadActive - 1);
      pumpUploads();
    });
  }
}

async function runUpload(item: TransferItem): Promise<void> {
  const { patch } = useTransferStore.getState();
  const control = controllers.get(item.id) ?? { canceled: false, paused: false };

  try {
    let serverId = item.serverId;
    let chunkSize = item.chunkSize;

    if (!serverId) {
      const init = await apiSend<InitResponse>("/api/drive/upload/init", {
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
      });
      serverId = init.transferId;
      chunkSize = init.chunkSize;
      patch(item.id, { serverId, chunkSize, status: "running" });
    }

    if (!chunkSize) throw new Error("Upload chunk size unavailable");

    const file = item.file;
    if (!file) throw new Error("File handle is gone; re-add the file to upload");

    if (item.size === 0) {
      // Zero-byte uploads still need one finalising chunk in Drive's resumable protocol.
      await sendChunk(serverId, chunkSize, new Uint8Array(0), 0, 0);
    } else {
      let offset = item.bytesTransferred;
      if (offset > 0 && offset % chunkSize !== 0) {
        offset = Math.floor(offset / chunkSize) * chunkSize;
      }

      while (offset < file.size) {
        if (control.canceled) {
          patch(item.id, { status: "canceled" });
          return;
        }
        if (control.paused) {
          patch(item.id, { status: "paused" });
          return;
        }

        const end = Math.min(offset + chunkSize, file.size);
        const buffer = await file.slice(offset, end).arrayBuffer();
        const chunkIndex = Math.floor(offset / chunkSize);

        let attempt = 0;
        let done = false;
        while (!done) {
          try {
            const result = await sendChunk(serverId, chunkSize, new Uint8Array(buffer), offset, file.size);
            offset = result.bytesReceived;
            patch(item.id, { bytesTransferred: offset });
            if (result.status === "completed") {
              patch(item.id, {
                status: "completed",
                bytesTransferred: file.size,
                driveFileId: result.fileId,
              });
              done = true;
            } else {
              done = true;
            }
          } catch (error) {
            const message = errorMessage(error);
            if (/unauthorized|not connected/i.test(message)) {
              patch(item.id, { status: "failed", error: "Google Drive connection expired. Reconnect." });
              return;
            }
            attempt += 1;
            if (attempt > MAX_UPLOAD_RETRIES) {
              patch(item.id, { status: "failed", error: message });
              return;
            }
            const delay = backoffDelay(attempt);
            patch(item.id, { error: `Retrying in ${Math.round(delay / 1000)}s (${message})` });
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }

    patch(item.id, { status: "completed", bytesTransferred: item.size });
    void useTransferStore.getState().refreshHistory();
  } catch (error) {
    patch(item.id, { status: "failed", error: errorMessage(error) });
    void useTransferStore.getState().refreshHistory();
  }
}

async function sendChunk(
  serverId: string,
  chunkSize: number,
  data: Uint8Array,
  offset: number,
  total: number,
): Promise<ChunkResponse> {
  const chunkIndex = Math.floor(offset / chunkSize);
  const response = await fetch("/api/drive/upload/chunk", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-transfer-id": serverId,
      "x-chunk-index": String(chunkIndex),
    },
    body: data as unknown as BodyInit,
  });

  const payload = (await response.json().catch(() => ({}))) as ChunkResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Upload failed (${response.status})`);
  }
  return {
    status: payload.status ?? "progress",
    bytesReceived: payload.bytesReceived ?? offset + data.byteLength,
    fileId: payload.fileId ?? null,
  };
}

/* ----------------------------- download pump ---------------------------- */

function pumpDownloads(): void {
  const { items } = useTransferStore.getState();
  const queued = items.filter((item) => item.kind === "download" && item.status === "queued");
  for (const item of queued) {
    if (downloadActive >= CONCURRENT_DOWNLOADS) return;
    downloadActive += 1;
    useTransferStore.getState().patch(item.id, { status: "running" });
    void runDownload(item).finally(() => {
      downloadActive = Math.max(0, downloadActive - 1);
      pumpDownloads();
    });
  }
}

async function runDownload(item: TransferItem): Promise<void> {
  const { patch } = useTransferStore.getState();
  const control = controllers.get(item.id) ?? { canceled: false, paused: false };

  try {
    const response = await fetch(`/api/drive/download?fileId=${encodeURIComponent(item.driveFileId ?? "")}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      patch(item.id, { status: "failed", error: payload.error ?? `Download failed (${response.status})` });
      return;
    }
    if (!response.body) throw new Error("Empty response body");

    const total = Number(response.headers.get("Content-Length") ?? 0);
    patch(item.id, { size: total });

    const reader = response.body.getReader();
    const parts: BlobPart[] = [];
    let received = 0;

    for (;;) {
      if (control.canceled) {
        await reader.cancel();
        patch(item.id, { status: "canceled" });
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        parts.push(value as unknown as BlobPart);
        received += value.byteLength;
        patch(item.id, { bytesTransferred: received });
      }
    }

    const blob = new Blob(parts, { type: item.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    patch(item.id, { status: "completed", bytesTransferred: received });
    void useTransferStore.getState().refreshHistory();
  } catch (error) {
    patch(item.id, { status: "failed", error: errorMessage(error) });
    void useTransferStore.getState().refreshHistory();
  }
}

export function activeTransfers(items: TransferItem[]): TransferItem[] {
  return items.filter((item) => item.status === "running" || item.status === "queued");
}