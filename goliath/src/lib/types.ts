export type DriveItemKind = "file" | "folder";

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  kind: DriveItemKind;
  size: number;
  parentId: string | null;
  starred: boolean;
  trashed: boolean;
  modifiedTime: string;
  createdTime: string;
  md5: string | null;
  webViewLink: string | null;
  thumbnailLink: string | null;
  hasThumbnail: boolean;
  shared: boolean;
}

export interface DriveListing {
  items: DriveItem[];
  nextPageToken: string | null;
  kind: "folder" | "search";
}

export interface StorageUsage {
  limitBytes: number;
  usedBytes: number;
  usedInTrashBytes: number;
}

export interface GoogleAccountStatus {
  connected: boolean;
  email: string | null;
  scopes: string[];
  driveRootId: string | null;
  lastSyncedAt: string | null;
  configured: boolean;
  reason?: string;
}

export type TransferKind = "upload" | "download";
export type TransferStatus = "queued" | "running" | "paused" | "completed" | "failed" | "canceled";

export interface TransferRecord {
  id: string;
  kind: TransferKind;
  driveFileId: string | null;
  name: string;
  mimeType: string;
  size: number;
  bytesTransferred: number;
  chunkSize: number;
  status: TransferStatus;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export type AgentActionKind =
  | "search"
  | "read_metadata"
  | "read_text"
  | "summarize"
  | "rename"
  | "move"
  | "copy"
  | "trash"
  | "star";

export interface AgentActionLog {
  id: string;
  action: AgentActionKind;
  target: string;
  status: "pending" | "confirmed" | "executed" | "denied" | "failed";
  requiresConfirmation: boolean;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt?: string;
  meta?: Record<string, unknown>;
}

export interface AiToolDefinition {
  name: AgentActionKind;
  description: string;
  mutating: boolean;
  parameters: Record<string, unknown>;
}

export interface UserSettings {
  gridView: boolean;
  pageSize: number;
  confirmDelete: boolean;
  aiProvider: string;
  reduceMotion: boolean;
}