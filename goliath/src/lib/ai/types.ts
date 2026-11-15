export type AiRole = "system" | "user" | "assistant";

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
}

export interface AiCompletion {
  text: string;
  provider: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletion>;
  summarizePdf?(input: { base64Pdf: string; mimeType: string; prompt: string }): Promise<string>;
}

export interface AgentActionSpec {
  action:
    | "search"
    | "read_metadata"
    | "read_text"
    | "summarize"
    | "rename"
    | "move"
    | "copy"
    | "trash"
    | "star";
  query?: string;
  fileIds?: string[];
  name?: string;
  targetFolderId?: string;
  currentFolderId?: string;
  parentId?: string;
  starred?: boolean;
}

export const MUTATING_ACTIONS: ReadonlySet<string> = new Set([
  "rename",
  "move",
  "copy",
  "trash",
  "star",
]);