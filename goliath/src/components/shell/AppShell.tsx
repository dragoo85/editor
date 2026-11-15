"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  Cloud,
  Download,
  FileClock,
  Files,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings as SettingsIcon,
  Star,
  UploadCloud,
  UserCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { IconButton } from "@/components/ui/Button";
import { TransferDock } from "@/components/transfers/TransferDock";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/files", label: "Files", Icon: Files },
  { href: "/recent", label: "Recent", Icon: FileClock },
  { href: "/starred", label: "Starred", Icon: Star },
  { href: "/uploads", label: "Uploads", Icon: UploadCloud },
  { href: "/downloads", label: "Downloads", Icon: Download },
  { href: "/ai", label: "AI Workspace", Icon: Bot },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
  { href: "/account", label: "Account", Icon: UserCircle2 },
] as const;

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/files": "File manager",
  "/recent": "Recent files",
  "/starred": "Starred",
  "/uploads": "Upload manager",
  "/downloads": "Download manager",
  "/ai": "AI workspace",
  "/search": "Search",
  "/settings": "Settings",
  "/account": "Account & storage",
};

export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const title = TITLES[pathname] ?? "GOLIATH";

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-graphite-900/80 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-electric-500/40 bg-electric-500/10">
              <Cloud className="h-4 w-4 text-electric-400" />
            </span>
            <span className="text-sm font-semibold tracking-[0.34em] metal-text">GOLIATH</span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-silver-500 hover:bg-white/5 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-electric-500/10 text-white"
                    : "text-silver-400 hover:bg-white/[0.04] hover:text-silver-100",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-electric-400" : "text-silver-500 group-hover:text-silver-300",
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-graphite-800 text-xs font-semibold uppercase text-silver-300">
              {email.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-silver-200">{email}</p>
              <p className="text-[11px] text-silver-500">Signed in</p>
            </div>
            <IconButton label="Sign out" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-graphite-950/70 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-graphite-950/80 px-4 backdrop-blur-xl sm:px-6">
          <IconButton label="Open navigation" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-4 w-4" />
          </IconButton>

          <h1 className="truncate text-sm font-medium tracking-wide text-silver-200 sm:text-base">
            {title}
          </h1>

          <form
            className="ml-auto hidden w-full max-w-sm items-center gap-2 md:flex"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = query.trim();
              if (trimmed.length >= 2) {
                router.push(`/search?q=${encodeURIComponent(trimmed)}`);
              }
            }}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-silver-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Drive…"
                aria-label="Search Drive"
                className="input pl-9"
              />
            </div>
          </form>

          <Link href="/search" className="btn btn-ghost md:hidden" aria-label="Search">
            <Search className="h-4 w-4" />
          </Link>
          <TransferDock />
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}