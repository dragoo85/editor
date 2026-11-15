/**
 * Mobile API client. Talks to the same Next.js API routes as the web app,
 * authenticating with a Supabase access token (Authorization: Bearer).
 */
import * as SecureStore from "expo-secure-store";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const SESSION_KEY = "goliath.session";

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export async function restoreSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (!session.expires_at || session.expires_at * 1000 < Date.now()) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function persistSession(session: Session | null): Promise<void> {
  if (!session) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  session: Session | null,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!session) throw new ApiError("Not signed in", 401);

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof ArrayBuffer)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401) throw new ApiError("Session expired. Sign in again.", 401);

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const record = (payload ?? {}) as { error?: string };
    throw new ApiError(record.error ?? `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

export async function uploadChunk(
  session: Session,
  transferId: string,
  chunkIndex: number,
  data: ArrayBuffer,
): Promise<{ status: string; bytesReceived: number; fileId: string | null }> {
  const response = await fetch(`${API_URL}/api/drive/upload/chunk`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/octet-stream",
      "x-transfer-id": transferId,
      "x-chunk-index": String(chunkIndex),
    },
    body: data,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    status?: string;
    bytesReceived?: number;
    fileId?: string | null;
    error?: string;
  };
  if (!response.ok) throw new ApiError(payload.error ?? `Upload failed (${response.status})`, response.status);
  return {
    status: payload.status ?? "progress",
    bytesReceived: payload.bytesReceived ?? 0,
    fileId: payload.fileId ?? null,
  };
}