import {
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  Film,
  Folder,
  Presentation,
} from "lucide-react";
import type { DriveItem } from "@/lib/types";

export function fileVisual(item: Pick<DriveItem, "mimeType" | "kind" | "name">) {
  if (item.kind === "folder") {
    return { Icon: Folder, className: "text-electric-400/80" };
  }
  const mime = item.mimeType.toLowerCase();
  if (mime.startsWith("image/")) return { Icon: FileImage, className: "text-violet-300/80" };
  if (mime.startsWith("video/")) return { Icon: Film, className: "text-rose-300/80" };
  if (mime.startsWith("audio/")) return { Icon: FileAudio, className: "text-amber-300/80" };
  if (mime === "application/pdf") return { Icon: FileText, className: "text-red-300/80" };
  if (mime.includes("spreadsheet") || mime.includes("csv"))
    return { Icon: FileSpreadsheet, className: "text-emerald-300/80" };
  if (mime.includes("presentation")) return { Icon: Presentation, className: "text-orange-300/80" };
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("tar"))
    return { Icon: FileArchive, className: "text-yellow-300/80" };
  if (mime.includes("json") || mime.includes("javascript") || mime.includes("xml"))
    return { Icon: FileCode, className: "text-sky-300/80" };
  if (mime.startsWith("text/")) return { Icon: FileText, className: "text-silver-300/80" };
  return { Icon: FileIcon, className: "text-silver-400/80" };
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extensionOf(name: string): string {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toUpperCase().slice(0, 5);
}