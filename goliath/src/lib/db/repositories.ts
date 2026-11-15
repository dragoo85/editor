import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentActionKind,
  ChatMessage,
  DriveItem,
  TransferRecord,
  UserSettings,
} from "../types";

export interface GoogleAccountRow {
  id: string;
  user_id: string;
  provider_sub: string | null;
  email: string | null;
  encrypted_refresh_token: string | null;
  encrypted_access_token: string | null;
  access_token_expires_at: string | null;
  scopes: string[] | null;
  drive_root_id: string | null;
  connected_at: string | null;
  last_synced_at: string | null;
}

export interface FileRow {
  id: string;
  drive_file_id: string;
  user_id: string;
  name: string;
  mime_type: string;
  size: number;
  parent_drive_id: string | null;
  is_folder: boolean;
  starred: boolean;
  trashed: boolean;
  md5: string | null;
  modified_time: string | null;
  created_time: string | null;
  web_view_link: string | null;
  thumbnail_link: string | null;
  synced_at: string | null;
}

export interface Paged<T> {
  rows: T[];
  total: number;
}

const FILE_COLUMNS =
  "id,drive_file_id,user_id,name,mime_type,size,parent_drive_id,is_folder,starred,trashed,md5,modified_time,created_time,web_view_link,thumbnail_link,synced_at";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10) || 0;
  return 0;
}

export async function getGoogleAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<GoogleAccountRow | null> {
  const { data } = await supabase
    .from("google_accounts")
    .select(
      "id,user_id,provider_sub,email,encrypted_refresh_token,encrypted_access_token,access_token_expires_at,scopes,drive_root_id,connected_at,last_synced_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  return (data as GoogleAccountRow | null) ?? null;
}

export async function upsertGoogleAccount(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<GoogleAccountRow> & { connected_at?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("google_accounts")
    .upsert({ ...patch, user_id: userId }, { onConflict: "user_id" });
  if (error) throw new Error(`Failed to persist Google account: ${error.message}`);
}

export async function deleteGoogleAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("google_accounts").delete().eq("user_id", userId);
  if (error) throw new Error(`Failed to disconnect Google account: ${error.message}`);
}

export async function markDriveSync(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase
    .from("google_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function replaceFolderSnapshot(
  supabase: SupabaseClient,
  userId: string,
  items: DriveItem[],
  parentDriveId: string | null,
): Promise<void> {
  if (items.length === 0) return;
  const now = new Date().toISOString();

  const rows = items.map((item) => ({
    user_id: userId,
    drive_file_id: item.id,
    name: item.name,
    mime_type: item.mimeType,
    size: item.size,
    parent_drive_id: item.parentId ?? parentDriveId,
    is_folder: item.kind === "folder",
    starred: item.starred,
    trashed: item.trashed,
    md5: item.md5,
    modified_time: item.modifiedTime,
    created_time: item.createdTime,
    web_view_link: item.webViewLink,
    thumbnail_link: item.thumbnailLink,
    synced_at: now,
  }));

  const { error } = await supabase
    .from("files")
    .upsert(rows, { onConflict: "user_id,drive_file_id" });
  if (error) throw new Error(`Metadata sync failed: ${error.message}`);
}

export async function listFilesPage(
  supabase: SupabaseClient,
  userId: string,
  opts: { parentId: string | null; page: number; pageSize: number; sort: string },
): Promise<Paged<FileRow>> {
  const from = opts.page * opts.pageSize;
  const to = from + opts.pageSize - 1;

  let query = supabase
    .from("files")
    .select(FILE_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .eq("trashed", false);

  if (opts.parentId) {
    query = query.eq("parent_drive_id", opts.parentId);
  } else {
    query = query.is("parent_drive_id", null);
  }

  const ascending = opts.sort.endsWith(":asc");
  // UI sort keys are camelCase; the table columns are snake_case.
  const columnMap: Record<string, string> = {
    name: "name",
    size: "size",
    modifiedTime: "modified_time",
    createdTime: "created_time",
  };
  const column = columnMap[opts.sort.split(":")[0]] ?? "name";

  const { data, error, count } = await query
    .order("is_folder", { ascending: false })
    .order(column, { ascending })
    .order("name", { ascending: true })
    .range(from, to);

  if (error) throw new Error(`Failed to list files: ${error.message}`);
  return { rows: (data ?? []) as unknown as FileRow[], total: count ?? 0 };
}

export async function searchFilesPage(
  supabase: SupabaseClient,
  userId: string,
  opts: { q: string; page: number; pageSize: number },
): Promise<Paged<FileRow>> {
  const from = opts.page * opts.pageSize;
  const to = from + opts.pageSize - 1;
  const escaped = opts.q.replace(/[%,()]/g, " ").trim();

  const { data, error, count } = await supabase
    .from("files")
    .select(FILE_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .eq("trashed", false)
    .or(`name.ilike.%${escaped}%,mime_type.ilike.%${escaped}%`)
    .order("modified_time", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Search failed: ${error.message}`);
  return { rows: (data ?? []) as unknown as FileRow[], total: count ?? 0 };
}

export async function listRecentFiles(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<FileRow[]> {
  const { data, error } = await supabase
    .from("files")
    .select(FILE_COLUMNS)
    .eq("user_id", userId)
    .eq("trashed", false)
    .order("modified_time", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load recent files: ${error.message}`);
  return (data ?? []) as unknown as FileRow[];
}

export async function listStarredFiles(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<FileRow[]> {
  const { data, error } = await supabase
    .from("files")
    .select(FILE_COLUMNS)
    .eq("user_id", userId)
    .eq("starred", true)
    .eq("trashed", false)
    .order("modified_time", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load starred files: ${error.message}`);
  return (data ?? []) as unknown as FileRow[];
}

export async function countFiles(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("files")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("trashed", false);
  return count ?? 0;
}

function toSnakeKeys(row: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const column = key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
    acc[column] = value;
    return acc;
  }, {});
}

export async function upsertTransfers(
  supabase: SupabaseClient,
  userId: string,
  records: Record<string, unknown>[],
): Promise<void> {
  if (records.length === 0) return;
  const { error } = await supabase
    .from("transfers")
    .upsert(records.map((r) => ({ ...toSnakeKeys(r), user_id: userId })), { onConflict: "id" });
  if (error) throw new Error(`Failed to persist transfer: ${error.message}`);
}

export async function updateTransfer(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const row = toSnakeKeys(patch);
  const { error } = await supabase
    .from("transfers")
    .update(row)
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`Failed to update transfer: ${error.message}`);
}

export interface TransferRow {
  id: string;
  user_id: string;
  kind: string;
  drive_file_id: string | null;
  name: string;
  mime_type: string;
  size: number | string;
  bytes_transferred: number | string;
  chunk_size: number | string;
  status: string;
  error: string | null;
  session_uri_encrypted: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function getTransfer(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<TransferRow | null> {
  const { data } = await supabase
    .from("transfers")
    .select(
      "id,kind,drive_file_id,name,mime_type,size,bytes_transferred,chunk_size,status,error,session_uri_encrypted,created_at,completed_at",
    )
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as TransferRow | null) ?? null;
}

export async function listTransfers(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<TransferRecord[]> {
  const { data, error } = await supabase
    .from("transfers")
    .select(
      "id,kind,drive_file_id,name,mime_type,size,bytes_transferred,chunk_size,status,error,created_at,completed_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load transfers: ${error.message}`);
  return ((data ?? []) as unknown as TransferRecord[]).map((row) => ({
    ...row,
    size: toNumber(row.size),
    bytesTransferred: toNumber(row.bytesTransferred),
  }));
}

export async function setFavorite(
  supabase: SupabaseClient,
  userId: string,
  driveFileId: string,
  starred: boolean,
): Promise<void> {
  if (starred) {
    const { error } = await supabase
      .from("favorites")
      .upsert({ user_id: userId, drive_file_id: driveFileId }, { onConflict: "user_id,drive_file_id" });
    if (error) throw new Error(`Failed to add favorite: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("drive_file_id", driveFileId);
    if (error) throw new Error(`Failed to remove favorite: ${error.message}`);
  }
  await supabase
    .from("files")
    .update({ starred })
    .eq("user_id", userId)
    .eq("drive_file_id", driveFileId);
}

export async function listFavorites(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ drive_file_id: string }[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("drive_file_id")
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to load favorites: ${error.message}`);
  return (data ?? []) as { drive_file_id: string }[];
}

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  title: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to create conversation: ${error?.message}`);
  return data.id as string;
}

export async function appendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: ChatMessage["role"],
  content: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role, content, metadata: meta });
  if (error) throw new Error(`Failed to store message: ${error.message}`);
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; title: string; updated_at: string }[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id,title,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(`Failed to load conversations: ${error.message}`);
  return (data ?? []) as { id: string; title: string; updated_at: string }[];
}

export async function listMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("role,content,created_at,metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  return (data ?? []).map((row) => ({
    role: row.role as ChatMessage["role"],
    content: row.content as string,
    createdAt: row.created_at as string,
    meta: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}

export async function logAgentAction(
  supabase: SupabaseClient,
  userId: string,
  entry: {
    action: AgentActionKind;
    target: string;
    status: "pending" | "confirmed" | "executed" | "denied" | "failed";
    requiresConfirmation: boolean;
    details: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("agent_action_logs").insert({
    user_id: userId,
    action: entry.action,
    target: entry.target,
    status: entry.status,
    requires_confirmation: entry.requiresConfirmation,
    details: entry.details,
  });
  if (error) throw new Error(`Failed to log agent action: ${error.message}`);
}

export async function listAgentActions(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from("agent_action_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load agent logs: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

const DEFAULT_SETTINGS: UserSettings = {
  gridView: true,
  pageSize: 48,
  confirmDelete: true,
  aiProvider: "auto",
  reduceMotion: false,
};

export async function getSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSettings> {
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    gridView: Boolean(data.grid_view ?? DEFAULT_SETTINGS.gridView),
    pageSize: Number(data.page_size ?? DEFAULT_SETTINGS.pageSize),
    confirmDelete: Boolean(data.confirm_delete ?? DEFAULT_SETTINGS.confirmDelete),
    aiProvider: String(data.ai_provider ?? DEFAULT_SETTINGS.aiProvider),
    reduceMotion: Boolean(data.reduce_motion ?? DEFAULT_SETTINGS.reduceMotion),
  };
}

export async function updateSettings(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  const row = {
    user_id: userId,
    ...(patch.gridView !== undefined ? { grid_view: patch.gridView } : {}),
    ...(patch.pageSize !== undefined ? { page_size: patch.pageSize } : {}),
    ...(patch.confirmDelete !== undefined ? { confirm_delete: patch.confirmDelete } : {}),
    ...(patch.aiProvider !== undefined ? { ai_provider: patch.aiProvider } : {}),
    ...(patch.reduceMotion !== undefined ? { reduce_motion: patch.reduceMotion } : {}),
  };
  const { error } = await supabase.from("settings").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`Failed to save settings: ${error.message}`);
  return getSettings(supabase, userId);
}