import { NextResponse } from "next/server";
import { handleError, jsonError, requireSession } from "@/lib/api";
import { driveToken } from "@/lib/drive-service";
import { openDownload } from "@/lib/google/drive";
import { upsertTransfers } from "@/lib/db/repositories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newUploadId } from "@/lib/crypto";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function contentDisposition(name: string, inline = false): string {
  const safe = name.replace(/["\\\r\n]/g, "_");
  const disposition = inline ? "inline" : "attachment";
  return `${disposition}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");
    if (!fileId) return jsonError(400, "fileId is required");

    const token = await driveToken(session.userId);
    const range = request.headers.get("range");
    const inline = url.searchParams.get("disposition") === "inline";

    const { response, contentType, contentLength, name } = await openDownload({
      accessToken: token,
      fileId,
      range,
    });

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    if (contentLength > 0) headers.set("Content-Length", String(contentLength));
    headers.set("Content-Disposition", contentDisposition(name, inline));
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, max-age=3600");
    const upstreamRange = response.headers.get("Content-Range");
    if (upstreamRange) headers.set("Content-Range", upstreamRange);

    const supabase = await createSupabaseServerClient();
    const isPartial = range !== null;
    if (!isPartial) {
      await upsertTransfers(supabase, session.userId, [
        {
          id: newUploadId(),
          kind: "download",
          driveFileId: fileId,
          name,
          mimeType: contentType,
          size: contentLength,
          bytesTransferred: 0,
          chunkSize: env.uploadChunkBytes(),
          status: "running",
          error: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        } as never,
      ]).catch(() => undefined);
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not connected")) {
      return jsonError(401, error.message);
    }
    return handleError(error);
  }
}