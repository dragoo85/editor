import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { env, isSupabaseConfigured } from "../env";

/**
 * Request-scoped Supabase client bound to the signed-in user's cookies.
 * Every database read/write through this client is subject to Row Level Security.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render; middleware refreshes the session.
        }
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Resolves the caller from either the browser cookie session or a Supabase
 * access token sent as `Authorization: Bearer <token>` (used by the desktop and
 * mobile clients). Both paths run the same RLS-protected client.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();

  let accessToken: string | null = null;
  try {
    const headerStore = await headers();
    const authorization = headerStore.get("authorization");
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      accessToken = authorization.slice(7).trim();
    }
  } catch {
    // headers() is unavailable outside a request scope; fall back to cookies.
  }

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    if (data.user) return { id: data.user.id, email: data.user.email ?? null };
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}