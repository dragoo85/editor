"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "error";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: Tone;
}

interface ToastContextValue {
  push: (toast: { title: string; description?: string; tone?: Tone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { push: () => undefined };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    ({ title, description, tone = "info" }: { title: string; description?: string; tone?: Tone }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setItems((current) => [...current.slice(-4), { id, title, description, tone }]);
      setTimeout(() => remove(id), 6000);
    },
    [remove],
  );

  const value = useMemo(() => ({ push }), [push]);

  const icons: Record<Tone, React.ReactNode> = {
    info: <Info className="h-4 w-4 text-electric-400" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    error: <AlertTriangle className="h-4 w-4 text-red-400" />,
  };

  const borders: Record<Tone, string> = {
    info: "border-electric-500/30",
    success: "border-emerald-500/30",
    error: "border-red-500/30",
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,22rem)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto animate-rise-in rounded-xl border bg-graphite-900/95 p-3 shadow-panel backdrop-blur",
              borders[item.tone],
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{icons[item.tone]}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-silver-100">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-silver-500">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => remove(item.id)}
                className="rounded-md p-1 text-silver-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}