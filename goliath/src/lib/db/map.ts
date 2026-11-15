import type { DriveItem } from "../types";
import type { FileRow } from "./repositories";

export function rowToItem(row: FileRow): DriveItem {
  return {
    id: row.drive_file_id,
    name: row.name,
    mimeType: row.mime_type,
    kind: row.is_folder ? "folder" : "file",
    size: Number(row.size ?? 0),
    parentId: row.parent_drive_id ?? null,
    starred: Boolean(row.starred),
    trashed: Boolean(row.trashed),
    modifiedTime: row.modified_time ?? new Date(0).toISOString(),
    createdTime: row.created_time ?? new Date(0).toISOString(),
    md5: row.md5 ?? null,
    webViewLink: row.web_view_link ?? null,
    thumbnailLink: row.thumbnail_link ?? null,
    hasThumbnail: Boolean(row.thumbnail_link),
    shared: false,
  };
}