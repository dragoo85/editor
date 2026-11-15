"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  FolderPlus,
  Grid2X2,
  Home,
  List,
  Loader2,
  MoreVertical,
  MoveRight,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { apiSend, errorMessage } from "@/lib/client/api";
import { formatBytes } from "@/lib/transfer/plan";
import { fileVisual, formatRelativeTime } from "@/lib/client/format";
import { useTransferStore } from "@/lib/client/transfers";
import type { DriveItem } from "@/lib/types";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, ErrorState, SkeletonGrid, Spinner } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ContextMenu, type MenuAction } from "./ContextMenu";
import { PreviewModal } from "./PreviewModal";

interface TrailEntry {
  id: string;
  name: string;
}

type SortKey = "name:asc" | "name:desc" | "modifiedTime:desc" | "modifiedTime:asc" | "size:desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name:asc", label: "Name A–Z" },
  { value: "name:desc", label: "Name Z–A" },
  { value: "modifiedTime:desc", label: "Newest first" },
  { value: "modifiedTime:asc", label: "Oldest first" },
  { value: "size:desc", label: "Largest first" },
];

export function FileBrowser({
  variant,
  folderId: initialFolderId,
  title,
  emptyTitle,
  emptyDescription,
}: {
  variant: "folder" | "recent" | "starred";
  folderId?: string | null;
  title: string;
  emptyTitle: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const enqueueUpload = useTransferStore((state) => state.enqueueUpload);
  const enqueueDownload = useTransferStore((state) => state.enqueueDownload);

  const [folderId, setFolderId] = useState<string | null>(initialFolderId ?? null);
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>("name:asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ item: DriveItem; x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<DriveItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const isFolderView = variant === "folder";

  const buildUrl = useCallback(
    (pageToken?: string | null) => {
      if (variant === "recent") {
        const params = new URLSearchParams({ limit: "60" });
        return `/api/drive/recent?${params.toString()}`;
      }
      if (variant === "starred") {
        const params = new URLSearchParams({ limit: "60" });
        return `/api/drive/starred?${params.toString()}`;
      }
      const params = new URLSearchParams({ pageSize: "60", sort });
      if (folderId) params.set("folderId", folderId);
      if (pageToken) params.set("pageToken", pageToken);
      return `/api/drive/files?${params.toString()}`;
    },
    [folderId, sort, variant],
  );

  const load = useCallback(
    async (pageToken?: string | null) => {
      const append = Boolean(pageToken);
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildUrl(pageToken), { cache: "no-store" });
        const payload = (await response.json()) as {
          items?: DriveItem[];
          nextPageToken?: string | null;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? `Failed to load (${response.status})`);

        const incoming = payload.items ?? [];
        setItems((current) => (append ? [...current, ...incoming] : incoming));
        setNextPageToken(payload.nextPageToken ?? null);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildUrl, variant],
  );

  const loadTrail = useCallback(async (targetFolderId: string | null) => {
    if (!targetFolderId) {
      setTrail([]);
      return;
    }
    const entries: TrailEntry[] = [];
    let cursor: string | null = targetFolderId;
    let guard = 0;
    while (cursor && guard < 8) {
      guard += 1;
      try {
        const response = await fetch(`/api/drive/meta?fileId=${encodeURIComponent(cursor)}`, {
          cache: "no-store",
        });
        if (!response.ok) break;
        const payload = (await response.json()) as { item: DriveItem };
        entries.unshift({ id: payload.item.id, name: payload.item.name });
        cursor = payload.item.parentId;
      } catch {
        break;
      }
    }
    setTrail(entries);
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  useEffect(() => {
    if (isFolderView) void loadTrail(folderId);
  }, [folderId, isFolderView, loadTrail]);

  useEffect(() => {
    const handler = () => void load(null);
    window.addEventListener("goliath:refresh-files", handler);
    return () => window.removeEventListener("goliath:refresh-files", handler);
  }, [load]);

  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + (item.kind === "file" ? item.size : 0), 0),
    [items],
  );

  function openFolder(item: DriveItem) {
    if (!isFolderView) {
      router.push(`/files?folderId=${encodeURIComponent(item.id)}`);
      return;
    }
    setSelected(new Set());
    setFolderId(item.id);
    setTrail((current) => [...current, { id: item.id, name: item.name }]);
  }

  async function runAction(
    action: string,
    payload: Record<string, unknown>,
    successMessage: string,
  ) {
    setBusy(true);
    try {
      await apiSend("/api/drive/mutate", { action, ...payload });
      toast.push({ title: successMessage, tone: "success" });
      await load(null);
      if (variant === "starred" || variant === "recent") router.refresh();
    } catch (err) {
      toast.push({ title: "Action failed", description: errorMessage(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    for (const file of list) {
      enqueueUpload(file, folderId ?? undefined);
    }
    toast.push({
      title: `${list.length} upload${list.length > 1 ? "s" : ""} queued`,
      description: "Track progress in the transfer manager.",
      tone: "info",
    });
  }

  const menuActions = useCallback((): MenuAction[] => {
    if (!menu) return [];
    const item = menu.item;
    const isFile = item.kind === "file";
    return [
      {
        label: isFile ? "Preview" : "Open folder",
        icon: <ChevronRight className="h-3.5 w-3.5" />,
        onSelect: () => (isFile ? setPreview(item) : openFolder(item)),
      },
      ...(isFile
        ? [
            {
              label: "Download",
              icon: <Download className="h-3.5 w-3.5" />,
              onSelect: () => enqueueDownload(item),
            },
            {
              label: "Copy",
              icon: <Copy className="h-3.5 w-3.5" />,
              onSelect: () =>
                void runAction(
                  "copy",
                  { fileId: item.id, name: `Copy of ${item.name}`, parentId: folderId ?? undefined },
                  "File copied",
                ),
            },
            {
              label: item.starred ? "Remove star" : "Add star",
              icon: <Star className="h-3.5 w-3.5" />,
              onSelect: () =>
                void runAction(
                  "star",
                  { fileId: item.id, starred: !item.starred },
                  item.starred ? "Star removed" : "Starred",
                ),
            },
            {
              label: "Move to GOLIATH root",
              icon: <MoveRight className="h-3.5 w-3.5" />,
              onSelect: () => void moveToRoot(item),
            },
          ]
        : []),
      {
        label: "Rename",
        icon: <Pencil className="h-3.5 w-3.5" />,
        separator: true,
        onSelect: () => {
          setRenameTarget(item);
          setRenameValue(item.name);
        },
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        tone: "danger",
        onSelect: () => setDeleteTarget(item),
      },
    ];
  }, [menu, folderId, enqueueDownload, variant]);

  async function moveToRoot(item: DriveItem) {
    try {
      const response = await fetch("/api/drive/root", { cache: "no-store" });
      const payload = (await response.json()) as { rootId?: string; error?: string };
      if (!response.ok || !payload.rootId) {
        throw new Error(payload.error ?? "Could not resolve the GOLIATH root folder");
      }
      await runAction(
        "move",
        {
          fileId: item.id,
          targetFolderId: payload.rootId,
          currentFolderId: folderId ?? undefined,
        },
        "Moved to GOLIATH root",
      );
    } catch (err) {
      toast.push({ title: "Move failed", description: errorMessage(err), tone: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-silver-100">{title}</h2>
          <p className="mt-0.5 text-xs text-silver-500">
            {items.length} item{items.length === 1 ? "" : "s"}
            {isFolderView && items.some((i) => i.kind === "file")
              ? ` · ${formatBytes(totalSize)}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort files"
            className="input h-9 w-auto py-0 text-xs"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-graphite-900">
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5">
            <IconButton label="Grid view" active={view === "grid"} onClick={() => setView("grid")}>
              <Grid2X2 className="h-4 w-4" />
            </IconButton>
            <IconButton label="List view" active={view === "list"} onClick={() => setView("list")}>
              <List className="h-4 w-4" />
            </IconButton>
          </div>

          <IconButton label="Refresh" onClick={() => void load(null)}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </IconButton>

          {isFolderView ? (
            <Button icon={<FolderPlus className="h-4 w-4" />} onClick={() => setNewFolderOpen(true)}>
              New folder
            </Button>
          ) : null}

          <label className="btn btn-primary cursor-pointer">
            <UploadCloud className="h-4 w-4" />
            Upload
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {isFolderView ? (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-silver-500">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-white/5 hover:text-white"
            onClick={() => {
              setFolderId(null);
              setTrail([]);
              setSelected(new Set());
            }}
          >
            <Home className="h-3.5 w-3.5" /> GOLIATH
          </button>
          {trail.map((entry) => (
            <span key={entry.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-silver-600" />
              <button
                type="button"
                className="max-w-[14rem] truncate rounded-md px-1.5 py-1 hover:bg-white/5 hover:text-white"
                onClick={() => {
                  setFolderId(entry.id);
                  setTrail((current) => {
                    const index = current.findIndex((t) => t.id === entry.id);
                    return current.slice(0, index + 1);
                  });
                  setSelected(new Set());
                }}
              >
                {entry.name}
              </button>
            </span>
          ))}
        </nav>
      ) : null}

      <div
        ref={dropRef}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length > 0) void uploadFiles(event.dataTransfer.files);
        }}
        className={cn(
          "relative min-h-[20rem] rounded-2xl transition-colors",
          dragging && "ring-2 ring-electric-500/60 ring-offset-2 ring-offset-graphite-950",
        )}
      >
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border border-dashed border-electric-500/50 bg-graphite-950/70">
            <p className="flex items-center gap-2 text-sm font-medium text-electric-300">
              <UploadCloud className="h-5 w-5" /> Drop to upload into this folder
            </p>
          </div>
        ) : null}

        {loading ? (
          <SkeletonGrid count={10} />
        ) : error ? (
          <ErrorState title="Could not load files" description={error} onRetry={() => void load(null)} />
        ) : items.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              isFolderView ? (
                <Button variant="primary" icon={<UploadCloud className="h-4 w-4" />} onClick={() => setNewFolderOpen(true)}>
                  Create a folder
                </Button>
              ) : undefined
            }
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {items.map((item) => {
              const { Icon, className } = fileVisual(item);
              const active = selected.has(item.id);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey) {
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }
                  }}
                  onDoubleClick={() => (item.kind === "folder" ? openFolder(item) : setPreview(item))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      if (item.kind === "folder") openFolder(item);
                      else setPreview(item);
                    }
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMenu({ item, x: event.clientX, y: event.clientY });
                  }}
                  className={cn("grid-file-card p-3", active && "border-electric-500/60 bg-electric-500/[0.06]")}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/5 bg-graphite-800/80">
                      {item.kind === "file" && item.mimeType.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/drive/download?fileId=${item.id}&disposition=inline`}
                          alt=""
                          loading="lazy"
                          className="h-11 w-11 rounded-lg object-cover"
                        />
                      ) : (
                        <Icon className={cn("h-5 w-5", className)} />
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label={`Actions for ${item.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenu({ item, x: rect.right - 8, y: rect.bottom + 4 });
                      }}
                      className="card-actions rounded-md p-1 text-silver-500 opacity-0 transition-opacity hover:bg-white/5 hover:text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="mt-3 truncate text-xs font-medium text-silver-200" title={item.name}>
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-silver-500">
                    {item.kind === "folder" ? "Folder" : formatBytes(item.size)} ·{" "}
                    {formatRelativeTime(item.modifiedTime)}
                  </p>

                  {item.starred ? (
                    <Star className="absolute bottom-3 right-3 h-3.5 w-3.5 fill-amber-300/80 text-amber-300/80" />
                  ) : null}
                  {active ? (
                    <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-electric-500 text-graphite-950">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/5">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-graphite-900/80 text-[11px] uppercase tracking-[0.12em] text-silver-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Type</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Size</th>
                  <th className="px-4 py-3 font-medium">Modified</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const { Icon, className } = fileVisual(item);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(new Set([item.id]))}
                      onDoubleClick={() => (item.kind === "folder" ? openFolder(item) : setPreview(item))}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setMenu({ item, x: event.clientX, y: event.clientY });
                      }}
                      className={cn(
                        "cursor-default border-t border-white/5 transition-colors hover:bg-white/[0.03]",
                        selected.has(item.id) && "bg-electric-500/[0.06]",
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <Icon className={cn("h-4 w-4 shrink-0", className)} />
                          <span className="truncate text-silver-200">{item.name}</span>
                          {item.starred ? <Star className="h-3 w-3 fill-amber-300/80 text-amber-300/80" /> : null}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2.5 text-silver-500 sm:table-cell">{item.mimeType}</td>
                      <td className="hidden px-4 py-2.5 text-silver-500 md:table-cell">
                        {item.kind === "folder" ? "—" : formatBytes(item.size)}
                      </td>
                      <td className="px-4 py-2.5 text-silver-500">{formatRelativeTime(item.modifiedTime)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          aria-label={`Actions for ${item.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                            setMenu({ item, x: rect.right - 8, y: rect.bottom + 4 });
                          }}
                          className="rounded-md p-1 text-silver-500 hover:bg-white/5 hover:text-white"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {nextPageToken ? (
          <div className="mt-4 flex justify-center">
            <Button loading={loadingMore} onClick={() => void load(nextPageToken)}>
              Load more
            </Button>
          </div>
        ) : null}

        {busy ? (
          <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-graphite-900/95 px-4 py-2 text-xs text-silver-300 shadow-panel">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…
          </div>
        ) : null}
      </div>

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          actions={menuActions()}
          onClose={() => setMenu(null)}
        />
      ) : null}

      <PreviewModal item={preview} onClose={() => setPreview(null)} />

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename"
        description={renameTarget ? `Current name: ${renameTarget.name}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={renameValue.trim().length === 0}
              onClick={() => {
                if (!renameTarget) return;
                void runAction("rename", { fileId: renameTarget.id, name: renameValue.trim() }, "Renamed");
                setRenameTarget(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <label className="label" htmlFor="rename-value">
          New name
        </label>
        <input
          id="rename-value"
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          className="input"
          autoFocus
        />
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete permanently?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be moved to the Google Drive trash. You can restore it from Drive for 30 days.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => {
                if (!deleteTarget) return;
                void runAction(
                  "trash",
                  { fileId: deleteTarget.id, confirmed: true },
                  "Moved to trash",
                );
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-silver-500">
          This action is logged and requires Drive write access. Nothing is deleted from your machine.
        </p>
      </Modal>

      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="New folder"
        description="Folders are created inside the current GOLIATH folder in your Drive."
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={newFolderName.trim().length === 0}
              onClick={() => {
                void runAction(
                  "createFolder",
                  { name: newFolderName.trim(), parentId: folderId ?? undefined },
                  "Folder created",
                );
                setNewFolderName("");
                setNewFolderOpen(false);
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <label className="label" htmlFor="folder-name">
          Folder name
        </label>
        <input
          id="folder-name"
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          className="input"
          placeholder="Projects"
          autoFocus
        />
        <p className="mt-3 flex items-center gap-2 text-xs text-silver-500">
          <Spinner className="h-3 w-3" /> Created via the Drive API, never mocked.
        </p>
      </Modal>

      {selected.size > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-graphite-900/95 px-4 py-2 text-xs shadow-panel">
          <Badge tone="accent">{selected.size} selected</Badge>
          <button
            type="button"
            className="text-silver-400 hover:text-white"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}