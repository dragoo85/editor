"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface MenuAction {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  separator?: boolean;
  disabled?: boolean;
}

export function ContextMenu({
  x,
  y,
  actions,
  onClose,
}: {
  x: number;
  y: number;
  actions: MenuAction[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    setPosition({
      x: Math.max(8, Math.min(x, maxX)),
      y: Math.max(8, Math.min(y, maxY)),
    });
  }, [x, y]);

  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("click", handler);
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: position.x, top: position.y }}
      className="fixed z-[75] w-56 animate-rise-in overflow-hidden rounded-xl border border-white/10 bg-graphite-900/98 p-1.5 shadow-panel backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
    >
      {actions.map((action) => (
        <div key={action.label}>
          {action.separator ? <div className="my-1 h-px bg-white/5" /> : null}
          <button
            type="button"
            role="menuitem"
            disabled={action.disabled}
            onClick={() => {
              if (action.disabled) return;
              action.onSelect();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-40",
              action.tone === "danger"
                ? "text-red-300 hover:bg-red-500/10 hover:text-red-200"
                : "text-silver-300 hover:bg-white/5 hover:text-white",
            )}
          >
            {action.icon}
            {action.label}
          </button>
        </div>
      ))}
    </div>
  );
}