import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { getTransfer, updateTransfer } from "@/lib/db/repositories";
import { driveToken } from "@/lib/drive-service";
import { DriveError, uploadChunk } from "@/lib/google/drive";
import { handleError, jsonError, requireSession } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const transferId = request.headers.get("x-transfer-id");
    const chunkIndexHeader = request.headers.get("x-chunk-index");
    if (!transferId || chunkIndexHeader === null) {
      return jsonError(400, "Missing x-transfer-id or x-chunk-index header");
    }
    const chunkIndex = Number.parseInt(chunkIndexHeader, 10);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return jsonError(400, "Invalid chunk index");
    }

    const supabase = await createSupabaseServerClient();
    const transfer = await getTransfer(supabase, session.userId, transferId);
    if (!transfer) return jsonError(404, "Unknown transfer");
    if (transfer.status === "canceled") return jsonError(409, "Transfer was canceled");
    if (!transfer.session_uri_encrypted) return jsonError(409, "Upload session is missing");

    const chunkSize = Number(transfer.chunk_size) || 0;
    const totalSize = Number(transfer.size) || 0;
    const alreadyReceived = Number(transfer.bytes_transferred) || 0;

    if (chunkSize <= 0) return jsonError(409, "Transfer has no chunk size");

    const buffer = await request.arrayBuffer();
    const data = new Uint8Array(buffer);
    // Zero-byte files are legal: a single empty finalising chunk closes the session.
    if (data.byteLength === 0 && totalSize !== 0) return jsonError(400, "Empty chunk");

    const offset = chunkIndex * chunkSize;
    if (offset + data.byteLength > totalSize) {
      return jsonError(400, "Chunk exceeds declared file size");
    }

    const finalize = offset + data.byteLength >= totalSize;
    const token = await driveToken(session.userId);

    const result = await uploadChunk({
      sessionUri: decryptSecret(transfer.session_uri_encrypted),
      accessToken: token,
      data,
      offset,
      total: totalSize,
      finalize,
    });

    const completed = result.status === "completed";
    const bytesTransferred = completed
      ? totalSize
      : Math.max(offset + data.byteLength, alreadyReceived);

    await updateTransfer(supabase, session.userId, transferId, {
      status: completed ? "completed" : "running",
      bytesTransferred: completed ? totalSize : bytesTransferred,
      completedAt: completed ? new Date().toISOString() : null,
      sessionUriEncrypted: completed ? null : transfer.session_uri_encrypted,
      ...(completed && result.fileId ? { driveFileId: result.fileId } : {}),
    });

    if (completed && result.fileId) {
      const now = new Date().toISOString();
      await supabase.from("files").upsert(
        {
          user_id: session.userId,
          drive_file_id: result.fileId,
          name: transfer.name,
          mime_type: transfer.mime_type,
          size: totalSize,
          parent_drive_id: transfer.drive_file_id ?? null,
          is_folder: false,
          starred: false,
          trashed: false,
          modified_time: now,
          created_time: now,
          synced_at: now,
        },
        { onConflict: "user_id,drive_file_id" },
      );
    }

    return NextResponse.json({
      status: completed ? "completed" : "progress",
      bytesReceived: completed ? totalSize : bytesTransferred,
      bytesTransferred: completed ? totalSize : bytesTransferred,
      fileId: result.fileId,
    });
  } catch (error) {
    if (error instanceof DriveError) {
      return jsonError(error.status === 401 ? 401 : 502, error.message);
    }
    return handleError(error);
  }
}