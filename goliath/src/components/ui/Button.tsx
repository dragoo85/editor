"use client";

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "primary" | "danger" | "ghost";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  default: "btn",
  primary: "btn btn-primary",
  danger: "btn btn-danger",
  ghost: "btn btn-ghost",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", loading, icon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(variantClass[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  children,
  variant = "default",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link href={href} className={cn(variantClass[variant], className)} {...props}>
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  children,
  className,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-silver-400 transition-colors",
        "hover:border-white/10 hover:bg-white/5 hover:text-white disabled:opacity-40",
        active && "border-electric-500/40 bg-electric-500/15 text-electric-300",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}