import type { DriveItem, DriveListing, StorageUsage } from "../types";

/**
 * Google Drive API v3 client implemented with fetch so the surface stays auditable.
 * Handles folder creation, listing, metadata mutation, resumable upload sessions
 * (start / status / chunk / finalize / cancel) and streamed downloads.
 */

const DEFAULT_DRIVE_API = "https://www.googleapis.com/drive/v3";
const DEFAULT_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

/**
 * Endpoint overrides. Used by the protocol tests against a local fake Drive and
 * by deployments that must route Google traffic through a proxy.
 */
function driveApi(): string {
  return process.env.GOLIATH_DRIVE_API_BASE ?? DEFAULT_DRIVE_API;
}

function uploadApi(): string {
  return process.env.GOLIATH_DRIVE_UPLOAD_BASE ?? DEFAULT_UPLOAD_API;
}

export const GOLIATH_ROOT_NAME = "GOLIATH";
const ROOT_MARKER_KEY = "goliathRoot";
const ROOT_MARKER_VALUE = "1";

const FILE_FIELDS = [
  "id",
  "name",
  "mimeType",
  "size",
  "parents",
  "starred",
  "trashed",
  "modifiedTime",
  "createdTime",
  "md5Checksum",
  "webViewLink",
  "thumbnailLink",
  "hasThumbnail",
  "shared",
].join(",");

export class DriveError extends Error {
  status: number;
  reason: string | undefined;

  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = "DriveError";
    this.status = status;
    this.reason = reason;
  }
}

interface DriveRawFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  starred?: boolean;
  trashed?: boolean;
  modifiedTime?: string;
  createdTime?: string;
  md5Checksum?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  hasThumbnail?: boolean;
  shared?: boolean;
}

function toItem(raw: DriveRawFile): DriveItem {
  const isFolder = raw.mimeType === "application/vnd.google-apps.folder";
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    kind: isFolder ? "folder" : "file",
    size: raw.size ? Number.parseInt(raw.size, 10) || 0 : 0,
    parentId: raw.parents?.[0] ?? null,
    starred: Boolean(raw.starred),
    trashed: Boolean(raw.trashed),
    modifiedTime: raw.modifiedTime ?? new Date(0).toISOString(),
    createdTime: raw.createdTime ?? new Date(0).toISOString(),
    md5: raw.md5Checksum ?? null,
    webViewLink: raw.webViewLink ?? null,
    thumbnailLink: raw.thumbnailLink ?? null,
    hasThumbnail: Boolean(raw.hasThumbnail),
    shared: Boolean(raw.shared),
  };
}

async function driveFetch(
  accessToken: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=UTF-8");
  }

  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  if (response.ok) return response;

  let message = `Drive API error ${response.status}`;
  let reason: string | undefined;
  try {
    const payload = (await response.json()) as {
      error?: { message?: string; status?: string; errors?: { reason?: string }[] };
    };
    if (payload.error?.message) message = payload.error.message;
    reason = payload.error?.errors?.[0]?.reason ?? payload.error?.status;
  } catch {
    // Non-JSON error body; keep the status-based message.
  }
  throw new DriveError(message, response.status, reason);
}

function ensureAccessToken(accessToken: string | null | undefined): string {
  if (!accessToken) throw new DriveError("Google Drive is not connected", 401);
  return accessToken;
}

/* ------------------------------- folders -------------------------------- */

export async function findGoliathRoot(accessToken: string): Promise<string | null> {
  const accessTokenValue = ensureAccessToken(accessToken);
  const query = [
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    `properties has { key='${ROOT_MARKER_KEY}' and value='${ROOT_MARKER_VALUE}' }`,
  ].join(" and ");

  const url = `${driveApi()}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`;
  const response = await driveFetch(accessTokenValue, url);
  const payload = (await response.json()) as { files?: { id: string }[] };
  return payload.files?.[0]?.id ?? null;
}

export async function ensureGoliathRoot(accessToken: string): Promise<string> {
  const existing = await findGoliathRoot(accessToken);
  if (existing) return existing;

  const accessTokenValue = ensureAccessToken(accessToken);
  const response = await driveFetch(accessTokenValue, `${driveApi()}/files`, {
    method: "POST",
    body: JSON.stringify({
      name: GOLIATH_ROOT_NAME,
      mimeType: "application/vnd.google-apps.folder",
      properties: { [ROOT_MARKER_KEY]: ROOT_MARKER_VALUE },
    }),
  });
  const payload = (await response.json()) as { id: string };
  if (!payload.id) throw new DriveError("Failed to create GOLIATH folder", response.status);
  return payload.id;
}

/* ------------------------------- listing -------------------------------- */

export interface ListOptions {
  accessToken: string;
  folderId: string | null;
  pageToken?: string | null;
  pageSize?: number;
  orderBy?: string;
}

export async function listChildren({
  accessToken,
  folderId,
  pageToken,
  pageSize = 48,
  orderBy = "folder,name",
}: ListOptions): Promise<DriveListing> {
  const token = ensureAccessToken(accessToken);
  const clauses = ["trashed=false"];
  if (folderId) {
    clauses.push(`'${folderId.replace(/'/g, "")}' in parents`);
  }
  const url = `${driveApi()}/files?q=${encodeURIComponent(clauses.join(" and "))}` +
    `&fields=nextPageToken,files(${FILE_FIELDS})` +
    `&pageSize=${Math.min(200, Math.max(1, pageSize))}` +
    `&orderBy=${encodeURIComponent(orderBy)}` +
    `&spaces=drive` +
    (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

  const response = await driveFetch(token, url);
  const payload = (await response.json()) as {
    files?: DriveRawFile[];
    nextPageToken?: string;
  };
  return {
    items: (payload.files ?? []).map(toItem),
    nextPageToken: payload.nextPageToken ?? null,
    kind: "folder",
  };
}

export async function searchDrive({
  accessToken,
  query,
  pageToken,
  pageSize = 48,
  folderId,
}: {
  accessToken: string;
  query: string;
  pageToken?: string | null;
  pageSize?: number;
  folderId?: string | null;
}): Promise<DriveListing> {
  const token = ensureAccessToken(accessToken);
  const safe = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'").slice(0, 512);
  const clauses = ["trashed=false", `fullText contains '${safe}'`];
  if (folderId) clauses.push(`'${folderId}' in parents`);

  const url = `${driveApi()}/files?q=${encodeURIComponent(clauses.join(" and "))}` +
    `&fields=nextPageToken,files(${FILE_FIELDS})` +
    `&pageSize=${Math.min(100, Math.max(1, pageSize))}` +
    `&orderBy=modifiedTime desc` +
    (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

  const response = await driveFetch(token, url);
  const payload = (await response.json()) as { files?: DriveRawFile[]; nextPageToken?: string };
  return {
    items: (payload.files ?? []).map(toItem),
    nextPageToken: payload.nextPageToken ?? null,
    kind: "search",
  };
}

/* ------------------------------ mutations ------------------------------- */

export async function createFolder({
  accessToken,
  name,
  parentId,
}: {
  accessToken: string;
  name: string;
  parentId: string;
}): Promise<DriveItem> {
  const token = ensureAccessToken(accessToken);
  const response = await driveFetch(token, `${driveApi()}/files`, {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  const raw = (await response.json()) as DriveRawFile;
  return toItem(raw);
}

export async function renameFile({
  accessToken,
  fileId,
  name,
}: {
  accessToken: string;
  fileId: string;
  name: string;
}): Promise<DriveItem> {
  const token = ensureAccessToken(accessToken);
  const response = await driveFetch(token, `${driveApi()}/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return toItem((await response.json()) as DriveRawFile);
}

export async function moveFile({
  accessToken,
  fileId,
  addParents,
  removeParents,
}: {
  accessToken: string;
  fileId: string;
  addParents: string;
  removeParents?: string | null;
}): Promise<DriveItem> {
  const token = ensureAccessToken(accessToken);
  let url = `${driveApi()}/files/${encodeURIComponent(fileId)}?addParents=${encodeURIComponent(addParents)}`;
  if (removeParents) url += `&removeParents=${encodeURIComponent(removeParents)}`;
  const response = await driveFetch(token, url, { method: "PATCH", body: JSON.stringify({}) });
  return toItem((await response.json()) as DriveRawFile);
}

export async function copyFile({
  accessToken,
  fileId,
  name,
  parentId,
}: {
  accessToken: string;
  fileId: string;
  name: string;
  parentId: string;
}): Promise<DriveItem> {
  const token = ensureAccessToken(accessToken);
  const response = await driveFetch(token, `${driveApi()}/files/${encodeURIComponent(fileId)}/copy`, {
    method: "POST",
    body: JSON.stringify({ name, parents: [parentId] }),
  });
  return toItem((await response.json()) as DriveRawFile);
}

export async function trashFile(accessToken: string, fileId: string): Promise<void> {
  const token = ensureAccessToken(accessToken);
  await driveFetch(token, `${driveApi()}/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    body: JSON.stringify({ trashed: true }),
  });
}

export async function setStarred({
  accessToken,
  fileId,
  starred,
}: {
  accessToken: string;
  fileId: string;
  starred: boolean;
}): Promise<void> {
  const token = ensureAccessToken(accessToken);
  await driveFetch(token, `${driveApi()}/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    body: JSON.stringify({ starred }),
  });
}

/* ------------------------------ usage ----------------------------------- */

export async function getStorageUsage(accessToken: string): Promise<StorageUsage> {
  const token = ensureAccessToken(accessToken);
  const url = `${driveApi()}/about?fields=storageQuota(limit,usage,usageInTrash)`;
  const response = await driveFetch(token, url);
  const payload = (await response.json()) as {
    storageQuota?: { limit?: string; usage?: string; usageInTrash?: string };
  };
  const quota = payload.storageQuota ?? {};
  return {
    limitBytes: quota.limit ? Number.parseInt(quota.limit, 10) || 0 : 0,
    usedBytes: quota.usage ? Number.parseInt(quota.usage, 10) || 0 : 0,
    usedInTrashBytes: quota.usageInTrash ? Number.parseInt(quota.usageInTrash, 10) || 0 : 0,
  };
}

/* --------------------------- resumable upload --------------------------- */

export interface ResumableSession {
  sessionUri: string;
  fileId: string | null;
}

export async function createResumableSession({
  accessToken,
  name,
  mimeType,
  size,
  parentId,
}: {
  accessToken: string;
  name: string;
  mimeType: string;
  size: number;
  parentId: string;
}): Promise<ResumableSession> {
  const token = ensureAccessToken(accessToken);
  const url = `${uploadApi()}/files?uploadType=resumable&fields=id,name,mimeType,size`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Goog-Upload-Protocol", "resumable");
  headers.set("X-Goog-Upload-Command", "start");
  headers.set("X-Goog-Upload-Header-Content-Length", String(size));
  headers.set("X-Goog-Upload-Header-Content-Type", mimeType || "application/octet-stream");
  headers.set("Content-Type", "application/json; charset=UTF-8");

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, parents: [parentId] }),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Failed to start resumable upload (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // ignore
    }
    throw new DriveError(message, response.status);
  }

  const sessionUri = response.headers.get("Location");
  if (!sessionUri) throw new DriveError("Drive did not return an upload session URI", response.status);
  return { sessionUri, fileId: null };
}

export async function queryUploadStatus({
  sessionUri,
  accessToken,
}: {
  sessionUri: string;
  accessToken: string;
}): Promise<number> {
  const response = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Goog-Upload-Command": "query",
      "Content-Length": "0",
    },
    cache: "no-store",
  });

  if (response.status === 200) return Number.MAX_SAFE_INTEGER; // upload already complete
  if (response.status !== 308) {
    throw new DriveError(`Upload status query failed (${response.status})`, response.status);
  }
  const range = response.headers.get("Range");
  if (!range) return 0;
  const match = /bytes=0-(\d+)/.exec(range);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) + 1;
}

export interface ChunkResult {
  status: "progress" | "completed";
  bytesReceived: number;
  fileId: string | null;
}

export async function uploadChunk({
  sessionUri,
  accessToken,
  data,
  offset,
  total,
  finalize,
}: {
  sessionUri: string;
  accessToken: string;
  data: Uint8Array;
  offset: number;
  total: number;
  finalize: boolean;
}): Promise<ChunkResult> {
  const end = offset + data.byteLength - 1;
  const response = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Length": String(data.byteLength),
      "Content-Range": `bytes ${offset}-${end}/${total}`,
      "X-Goog-Upload-Offset": String(offset),
      "X-Goog-Upload-Command": finalize ? "upload, finalize" : "upload",
    },
    body: data as unknown as BodyInit,
    cache: "no-store",
  });

  if (response.status === 308) {
    const range = response.headers.get("Range");
    const match = range ? /bytes=0-(\d+)/.exec(range) : null;
    return {
      status: "progress",
      bytesReceived: match ? Number.parseInt(match[1], 10) + 1 : end + 1,
      fileId: null,
    };
  }

  if (response.status !== 200 && response.status !== 201) {
    let message = `Upload chunk failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // ignore
    }
    throw new DriveError(message, response.status);
  }

  const payload = (await response.json().catch(() => ({}))) as { id?: string };
  return { status: "completed", bytesReceived: total, fileId: payload.id ?? null };
}

export async function cancelResumableSession(sessionUri: string, accessToken: string): Promise<void> {
  await fetch(sessionUri, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).catch(() => undefined);
}

/* ------------------------------ download -------------------------------- */

export interface DownloadResult {
  response: Response;
  contentType: string;
  contentLength: number;
  name: string;
}

export async function openDownload({
  accessToken,
  fileId,
  range,
}: {
  accessToken: string;
  fileId: string;
  range?: string | null;
}): Promise<DownloadResult> {
  const token = ensureAccessToken(accessToken);
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  if (range) headers.set("Range", range);

  const metaUrl = `${driveApi()}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`;
  const metaResponse = await driveFetch(token, metaUrl);
  const meta = (await metaResponse.json()) as {
    name?: string;
    mimeType?: string;
    size?: string;
  };

  const response = await driveFetch(
    token,
    `${driveApi()}/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers },
  );

  return {
    response,
    contentType: response.headers.get("Content-Type") ?? meta.mimeType ?? "application/octet-stream",
    contentLength: Number.parseInt(response.headers.get("Content-Length") ?? meta.size ?? "0", 10) || 0,
    name: meta.name ?? "download",
  };
}

export async function readTextFile({
  accessToken,
  fileId,
  maxBytes = 200_000,
}: {
  accessToken: string;
  fileId: string;
  maxBytes?: number;
}): Promise<string> {
  const { response } = await openDownload({ accessToken, fileId });
  if (!response.body) return "";
  const buffer = await response.arrayBuffer();
  const slice = new Uint8Array(buffer).slice(0, maxBytes);
  return new TextDecoder("utf-8", { fatal: false }).decode(slice);
}

export async function getMetadata(
  accessToken: string,
  fileId: string,
): Promise<DriveItem> {
  const token = ensureAccessToken(accessToken);
  const url = `${driveApi()}/files/${encodeURIComponent(fileId)}?fields=${FILE_FIELDS}`;
  const response = await driveFetch(token, url);
  return toItem((await response.json()) as DriveRawFile);
}

export async function downloadBytes({
  accessToken,
  fileId,
  maxBytes = 20 * 1024 * 1024,
}: {
  accessToken: string;
  fileId: string;
  maxBytes?: number;
}): Promise<{ bytes: Uint8Array; mimeType: string; name: string }> {
  const { response, contentType, name } = await openDownload({ accessToken, fileId });
  if (!response.body) return { bytes: new Uint8Array(), mimeType: contentType, name };
  const buffer = await response.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer).slice(0, maxBytes),
    mimeType: contentType,
    name,
  };
}

export function isTextLike(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("javascript") ||
    mimeType.includes("csv") ||
    mimeType.includes("yaml") ||
    mimeType === "application/rtf"
  );
}

export function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export function driveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}