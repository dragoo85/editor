"use client";

import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-electric-400", className)} aria-hidden />;
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-silver-500">
      <Spinner /> {label}…
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-36 rounded-xl border border-white/5 bg-graphite-850/60 p-3">
          <div className="skeleton h-12 w-12 rounded-lg" />
          <div className="skeleton mt-4 h-3 w-4/5" />
          <div className="skeleton mt-2 h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-graphite-900/40 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
        <Inbox className="h-5 w-5 text-silver-500" aria-hidden />
      </div>
      <h3 className="text-base font-medium text-silver-200">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-silver-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-6 py-14 text-center">
      <AlertTriangle className="mb-3 h-6 w-6 text-red-400" aria-hidden />
      <h3 className="text-base font-medium text-red-200">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-red-300/70">{description}</p> : null}
      {onRetry ? (
        <Button className="mt-5" onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "success" | "danger" | "warning";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/10 bg-white/[0.04] text-silver-400",
    accent: "border-electric-500/40 bg-electric-500/10 text-electric-300",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    danger: "border-red-500/40 bg-red-500/10 text-red-300",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "accent",
}: {
  value: number;
  className?: string;
  tone?: "accent" | "success" | "danger";
}) {
  const tones = {
    accent: "bg-electric-500",
    success: "bg-emerald-500",
    danger: "bg-red-500",
  } as const;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-graphite-700", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}