import { NextResponse } from "next/server";
import { handleError, jsonError, readJson, requireSession } from "@/lib/api";
import { rootFolderId, driveToken } from "@/lib/drive-service";
import { createResumableSession } from "@/lib/google/drive";
import { encryptSecret, newUploadId } from "@/lib/crypto";
import { upsertTransfers } from "@/lib/db/repositories";
import { env } from "@/lib/env";
import { planChunks } from "@/lib/transfer/plan";
import { optionalDriveId, requireNumber, requireString } from "@/lib/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 5 * 1024 ** 4; // Drive per-file ceiling (5 TB)

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const name = requireString(body, "name", { min: 1, max: 255 });
    const mimeType = requireString(body, "mimeType", { max: 128 });
    const size = requireNumber(body, "size", { min: 0, max: MAX_UPLOAD_BYTES, int: true });

    const token = await driveToken(session.userId);
    const parentId = optionalDriveId(body, "parentId") ?? (await rootFolderId(session.userId));

    const chunkSize = env.uploadChunkBytes();
    const plan = planChunks(size, chunkSize);

    const { sessionUri } = await createResumableSession({
      accessToken: token,
      name,
      mimeType,
      size,
      parentId,
    });

    const transferId = newUploadId();
    const supabase = await createSupabaseServerClient();
    await upsertTransfers(supabase, session.userId, [
      {
        id: transferId,
        kind: "upload",
        driveFileId: parentId,
        name,
        mimeType,
        size,
        bytesTransferred: 0,
        chunkSize,
        status: "queued",
        error: null,
        session_uri_encrypted: encryptSecret(sessionUri),
        createdAt: new Date().toISOString(),
        completedAt: null,
      } as never,
    ]);

    return NextResponse.json({
      transferId,
      chunkSize,
      totalChunks: plan.totalChunks,
      bytesTransferred: 0,
      parentId,
      size,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  return jsonError(405, "Use POST to initialise an upload");
}