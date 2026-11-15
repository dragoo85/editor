import { driveToken, search, rootFolderId } from "../drive-service";
import {
  DriveError,
  copyFile,
  downloadBytes,
  getMetadata,
  isPdf,
  isTextLike,
  moveFile,
  readTextFile,
  renameFile,
  setStarred,
  trashFile,
} from "../google/drive";
import type { AiProvider, AgentActionSpec } from "./types";
import { MUTATING_ACTIONS } from "./types";

export interface ToolResult {
  ok: boolean;
  summary: string;
  details: Record<string, unknown>;
  requiresConfirmation: boolean;
  executed: boolean;
}

function summarizeItems(items: { name: string; kind: string; size: number; id: string }[]): string {
  if (items.length === 0) return "No matching files were found";
  return items
    .slice(0, 25)
    .map((item) => `- ${item.name} (${item.kind}${item.kind === "file" ? `, ${item.size} bytes` : ""})`)
    .join("\n");
}

const MAX_TEXT_CHARS = 8000;

/**
 * Executes one agent action. Mutating actions are refused unless `confirmed` is true,
 * which only happens after the user explicitly approved the pending action.
 */
export async function executeAgentAction({
  userId,
  spec,
  provider,
  confirmed,
}: {
  userId: string;
  spec: AgentActionSpec;
  provider: AiProvider;
  confirmed: boolean;
}): Promise<ToolResult> {
  const token = await driveToken(userId);

  if (MUTATING_ACTIONS.has(spec.action) && !confirmed) {
    return {
      ok: false,
      summary: `Action "${spec.action}" requires your explicit confirmation before it runs.`,
      details: { action: spec.action, spec },
      requiresConfirmation: true,
      executed: false,
    };
  }

  try {
    switch (spec.action) {
      case "search": {
        if (!spec.query) {
          return { ok: false, summary: "A search query is required.", details: {}, requiresConfirmation: false, executed: false };
        }
        const listing = await search(userId, spec.query, null, 25);
        return {
          ok: true,
          summary: `Found ${listing.items.length} result(s):\n${summarizeItems(listing.items)}`,
          details: { count: listing.items.length, ids: listing.items.map((i) => i.id) },
          requiresConfirmation: false,
          executed: true,
        };
      }
      case "read_metadata": {
        if (!spec.fileIds?.length) {
          return { ok: false, summary: "No file ids supplied.", details: {}, requiresConfirmation: false, executed: false };
        }
        const items = await Promise.all(
          spec.fileIds.slice(0, 10).map((id) => getMetadata(token, id)),
        );
        const lines = items.map(
          (item) =>
            `- ${item.name} | ${item.mimeType} | ${item.size} bytes | modified ${item.modifiedTime}`,
        );
        return {
          ok: true,
          summary: `Metadata:\n${lines.join("\n")}`,
          details: { items: items.map((i) => ({ id: i.id, name: i.name, mimeType: i.mimeType, size: i.size })) },
          requiresConfirmation: false,
          executed: true,
        };
      }
      case "read_text": {
        if (!spec.fileIds?.length) {
          return { ok: false, summary: "No file ids supplied.", details: {}, requiresConfirmation: false, executed: false };
        }
        const meta = await getMetadata(token, spec.fileIds[0]);
        if (!isTextLike(meta.mimeType)) {
          return {
            ok: false,
            summary: `"${meta.name}" is ${meta.mimeType}. Only text-like files can be read directly.`,
            details: { mimeType: meta.mimeType },
            requiresConfirmation: false,
            executed: false,
          };
        }
        const text = await readTextFile({ accessToken: token, fileId: meta.id, maxBytes: MAX_TEXT_CHARS });
        return {
          ok: true,
          summary: text.slice(0, MAX_TEXT_CHARS) || "(file is empty)",
          details: { fileId: meta.id, name: meta.name, truncated: text.length >= MAX_TEXT_CHARS },
          requiresConfirmation: false,
          executed: true,
        };
      }
      case "summarize": {
        if (!spec.fileIds?.length) {
          return { ok: false, summary: "No file ids supplied.", details: {}, requiresConfirmation: false, executed: false };
        }
        const meta = await getMetadata(token, spec.fileIds[0]);
        if (isPdf(meta.mimeType)) {
          if (!provider.summarizePdf) {
            return {
              ok: false,
              summary: "PDF summarisation needs the Gemini provider. Configure GEMINI_API_KEY to enable it.",
              details: { mimeType: meta.mimeType },
              requiresConfirmation: false,
              executed: false,
            };
          }
          const { bytes, mimeType } = await downloadBytes({
            accessToken: token,
            fileId: meta.id,
            maxBytes: 20 * 1024 * 1024,
          });
          const base64 = Buffer.from(bytes).toString("base64");
          const summary = await provider.summarizePdf({
            base64Pdf: base64,
            mimeType,
            prompt: `Summarise this document ("${meta.name}") in under 400 words. Cover purpose, key points and any action items.`,
          });
          return {
            ok: true,
            summary,
            details: { fileId: meta.id, name: meta.name, bytes: bytes.byteLength },
            requiresConfirmation: false,
            executed: true,
          };
        }
        if (!isTextLike(meta.mimeType)) {
          return {
            ok: false,
            summary: `"${meta.name}" (${meta.mimeType}) cannot be summarised with the available providers.`,
            details: { mimeType: meta.mimeType },
            requiresConfirmation: false,
            executed: false,
          };
        }
        const text = await readTextFile({ accessToken: token, fileId: meta.id, maxBytes: 120_000 });
        const completion = await provider.complete({
          messages: [
            { role: "system", content: "Summarise the document precisely. No preamble." },
            { role: "user", content: `Document "${meta.name}":\n\n${text}` },
          ],
          temperature: 0.2,
        });
        return {
          ok: true,
          summary: completion.text,
          details: { fileId: meta.id, name: meta.name },
          requiresConfirmation: false,
          executed: true,
        };
      }
      case "rename": {
        if (!spec.fileIds?.length || !spec.name) {
          return { ok: false, summary: "rename needs fileIds[0] and name.", details: {}, requiresConfirmation: false, executed: false };
        }
        const updated = await renameFile({ accessToken: token, fileId: spec.fileIds[0], name: spec.name });
        return {
          ok: true,
          summary: `Renamed to "${updated.name}".`,
          details: { id: updated.id, name: updated.name },
          requiresConfirmation: true,
          executed: true,
        };
      }
      case "move": {
        if (!spec.fileIds?.length || !spec.targetFolderId) {
          return { ok: false, summary: "move needs fileIds[0] and targetFolderId.", details: {}, requiresConfirmation: false, executed: false };
        }
        const updated = await moveFile({
          accessToken: token,
          fileId: spec.fileIds[0],
          addParents: spec.targetFolderId,
          removeParents: spec.currentFolderId ?? null,
        });
        return {
          ok: true,
          summary: `Moved "${updated.name}" into folder ${spec.targetFolderId}.`,
          details: { id: updated.id, targetFolderId: spec.targetFolderId },
          requiresConfirmation: true,
          executed: true,
        };
      }
      case "copy": {
        if (!spec.fileIds?.length || !spec.name) {
          return { ok: false, summary: "copy needs fileIds[0] and name.", details: {}, requiresConfirmation: false, executed: false };
        }
        const parentId = spec.parentId ?? (await rootFolderId(userId));
        const created = await copyFile({ accessToken: token, fileId: spec.fileIds[0], name: spec.name, parentId });
        return {
          ok: true,
          summary: `Copied to "${created.name}".`,
          details: { id: created.id, name: created.name },
          requiresConfirmation: true,
          executed: true,
        };
      }
      case "trash": {
        if (!spec.fileIds?.length) {
          return { ok: false, summary: "trash needs fileIds[0].", details: {}, requiresConfirmation: false, executed: false };
        }
        await trashFile(token, spec.fileIds[0]);
        return {
          ok: true,
          summary: `Moved "${spec.fileIds[0]}" to the Drive trash.`,
          details: { id: spec.fileIds[0] },
          requiresConfirmation: true,
          executed: true,
        };
      }
      case "star": {
        if (!spec.fileIds?.length) {
          return { ok: false, summary: "star needs fileIds[0].", details: {}, requiresConfirmation: false, executed: false };
        }
        await setStarred({ accessToken: token, fileId: spec.fileIds[0], starred: spec.starred ?? true });
        return {
          ok: true,
          summary: `${spec.starred === false ? "Unstarred" : "Starred"} "${spec.fileIds[0]}".`,
          details: { id: spec.fileIds[0], starred: spec.starred ?? true },
          requiresConfirmation: true,
          executed: true,
        };
      }
      default:
        return { ok: false, summary: "Unsupported action.", details: {}, requiresConfirmation: false, executed: false };
    }
  } catch (error) {
    if (error instanceof DriveError) {
      return {
        ok: false,
        summary: `Drive error: ${error.message}`,
        details: { status: error.status, reason: error.reason },
        requiresConfirmation: false,
        executed: false,
      };
    }
    throw error;
  }
}