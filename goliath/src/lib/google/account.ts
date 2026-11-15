import { decryptSecret, encryptSecret } from "../crypto";
import {
  deleteGoogleAccount,
  getGoogleAccount,
  markDriveSync,
  upsertGoogleAccount,
  type GoogleAccountRow,
} from "../db/repositories";
import { env } from "../env";
import { createSupabaseServerClient } from "../supabase/server";
import type { GoogleAccountStatus } from "../types";
import { ensureGoliathRoot } from "./drive";
import { parseScopes, refreshAccessToken, revokeToken } from "./oauth";

const EXPIRY_SKEW_MS = 60_000;

function expiryMs(row: GoogleAccountRow): number {
  if (!row.access_token_expires_at) return 0;
  return new Date(row.access_token_expires_at).getTime();
}

/**
 * Returns a valid Drive access token for the user, refreshing (and persisting the
 * rotated token) when needed. Throws when no usable grant exists.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const row = await getGoogleAccount(supabase, userId);
  if (!row) return null;

  const now = Date.now();

  if (row.encrypted_access_token && expiryMs(row) - EXPIRY_SKEW_MS > now) {
    return decryptSecret(row.encrypted_access_token);
  }

  if (!row.encrypted_refresh_token) return null;

  const refreshed = await refreshAccessToken(decryptSecret(row.encrypted_refresh_token));
  const expiresAt = new Date(now + refreshed.expires_in * 1000).toISOString();

  await upsertGoogleAccount(supabase, userId, {
    encrypted_access_token: encryptSecret(refreshed.access_token),
    ...(refreshed.refresh_token
      ? { encrypted_refresh_token: encryptSecret(refreshed.refresh_token) }
      : {}),
    access_token_expires_at: expiresAt,
    ...(refreshed.scope ? { scopes: parseScopes(refreshed.scope) } : {}),
  });

  return refreshed.access_token;
}

export async function storeConnectedAccount({
  userId,
  tokens,
  email,
  providerSub,
}: {
  userId: string;
  tokens: { access_token: string; refresh_token?: string; expires_in: number; scope: string };
  email: string | null;
  providerSub: string | null;
}): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const accessToken = await getValidAccessToken(userId);

  const rootId = await ensureGoliathRoot(accessToken ?? tokens.access_token);

  await upsertGoogleAccount(supabase, userId, {
    encrypted_access_token: encryptSecret(tokens.access_token),
    ...(tokens.refresh_token ? { encrypted_refresh_token: encryptSecret(tokens.refresh_token) } : {}),
    access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scopes: parseScopes(tokens.scope),
    email,
    provider_sub: providerSub,
    drive_root_id: rootId,
    connected_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  });

  return rootId;
}

export async function getAccountStatus(userId: string): Promise<GoogleAccountStatus> {
  if (!env.googleClientId() || !env.googleClientSecret()) {
    return {
      connected: false,
      email: null,
      scopes: [],
      driveRootId: null,
      lastSyncedAt: null,
      configured: false,
      reason: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured",
    };
  }

  const supabase = await createSupabaseServerClient();
  const row = await getGoogleAccount(supabase, userId);
  if (!row) {
    return {
      connected: false,
      email: null,
      scopes: [],
      driveRootId: null,
      lastSyncedAt: null,
      configured: true,
    };
  }

  return {
    connected: Boolean(row.encrypted_refresh_token || row.encrypted_access_token),
    email: row.email,
    scopes: row.scopes ?? [],
    driveRootId: row.drive_root_id,
    lastSyncedAt: row.last_synced_at,
    configured: true,
  };
}

export async function disconnectAccount(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const row = await getGoogleAccount(supabase, userId);
  if (row?.encrypted_refresh_token) {
    await revokeToken(decryptSecret(row.encrypted_refresh_token));
  }
  await deleteGoogleAccount(supabase, userId);
  await supabase.from("files").delete().eq("user_id", userId);
  await supabase.from("transfers").delete().eq("user_id", userId);
  await supabase.from("favorites").delete().eq("user_id", userId);
}

export async function touchSync(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await markDriveSync(supabase, userId);
}