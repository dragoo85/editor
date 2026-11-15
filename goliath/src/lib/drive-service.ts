import { getGoogleAccount, replaceFolderSnapshot } from "@/lib/db/repositories";
import { DriveError, ensureGoliathRoot, listChildren, searchDrive } from "@/lib/google/drive";
import { getValidAccessToken } from "@/lib/google/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DriveItem, DriveListing, StorageUsage } from "@/lib/types";
import { getStorageUsage } from "@/lib/google/drive";

async function accessToken(userId: string): Promise<string> {
  const token = await getValidAccessToken(userId);
  if (!token) {
    throw Object.assign(new Error("Google Drive is not connected"), { status: 401 });
  }
  return token;
}

export async function rootFolderId(userId: string): Promise<string> {
  const token = await accessToken(userId);
  const supabase = await createSupabaseServerClient();
  const row = await getGoogleAccount(supabase, userId);
  if (row?.drive_root_id) return row.drive_root_id;
  const ensured = await ensureGoliathRoot(token);
  return ensured;
}

export async function listFolder(
  userId: string,
  opts: { folderId?: string | null; pageToken?: string | null; pageSize?: number; sort?: string },
): Promise<DriveListing> {
  const token = await accessToken(userId);
  const resolvedFolder = opts.folderId === undefined ? await rootFolderId(userId) : opts.folderId;

  const orderBy =
    opts.sort === "name:desc"
      ? "folder desc,name desc"
      : opts.sort === "modifiedTime:desc"
        ? "folder desc,modifiedTime desc"
        : opts.sort === "modifiedTime:asc"
          ? "folder desc,modifiedTime asc"
          : opts.sort === "size:desc"
            ? "folder desc,size desc"
            : "folder,name";

  const listing = await listChildren({
    accessToken: token,
    folderId: resolvedFolder ?? null,
    pageToken: opts.pageToken,
    pageSize: opts.pageSize,
    orderBy,
  });

  if (opts.pageToken === undefined || opts.pageToken === null) {
    const supabase = await createSupabaseServerClient();
    await replaceFolderSnapshot(supabase, userId, listing.items, resolvedFolder ?? null).catch(
      (error) => console.warn("[goliath] metadata snapshot failed", error),
    );
  }

  return listing;
}

export async function search(
  userId: string,
  q: string,
  pageToken?: string | null,
  pageSize?: number,
): Promise<DriveListing> {
  const token = await accessToken(userId);
  return searchDrive({ accessToken: token, query: q, pageToken, pageSize });
}

export async function usage(userId: string): Promise<StorageUsage> {
  const token = await accessToken(userId);
  return getStorageUsage(token);
}

export async function driveToken(userId: string): Promise<string> {
  return accessToken(userId);
}

export function rethrowDrive(error: unknown): never {
  if (error instanceof DriveError) {
    throw Object.assign(error, { status: error.status === 401 ? 401 : 502 });
  }
  throw error;
}

export type { DriveItem };