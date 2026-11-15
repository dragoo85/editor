"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SUPABASE_READY = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-silver-500">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setInfo("Check your inbox to confirm the address, then sign in.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-electric-500/40 bg-electric-500/10">
            <Cloud className="h-5 w-5 text-electric-400" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-[0.34em] metal-text">GOLIATH</p>
            <p className="text-[11px] text-silver-500">Cloud storage, rebuilt on your Drive</p>
          </div>
        </div>

        <div className="panel p-6">
          <h1 className="text-lg font-medium text-silver-100">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-1 text-xs text-silver-500">
            Accounts are managed by Supabase Auth with Row Level Security. Drive is linked after sign-in.
          </p>

          {!SUPABASE_READY ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-amber-200">
              Supabase is not configured. Copy <code className="rounded bg-black/30 px-1">.env.example</code> to
              <code className="ml-1 rounded bg-black/30 px-1">.env.local</code> and fill in the URL and anon key.
            </p>
          ) : null}

          <form className="mt-5 space-y-3" onSubmit={submit}>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input"
                placeholder="At least 8 characters"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/[0.06] p-2.5 text-xs text-red-200">{error}</p>
            ) : null}
            {info ? (
              <p className="rounded-lg border border-electric-500/30 bg-electric-500/[0.06] p-2.5 text-xs text-electric-200">
                {info}
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary w-full" disabled={busy || !SUPABASE_READY}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            className="mt-3 w-full text-center text-xs text-silver-500 hover:text-electric-300"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-silver-600">
          <ShieldCheck className="h-3.5 w-3.5" /> Drive tokens are encrypted server-side and never exposed to the browser.
        </p>
      </div>
    </div>
  );
}