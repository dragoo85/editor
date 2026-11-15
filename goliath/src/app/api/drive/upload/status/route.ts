import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { getTransfer, updateTransfer } from "@/lib/db/repositories";
import { driveToken } from "@/lib/drive-service";
import { queryUploadStatus } from "@/lib/google/drive";
import { handleError, jsonError, readJson, requireSession } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Asks Drive how many bytes it already accepted, so a browser refresh can resume. */
export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const transferId = typeof body.transferId === "string" ? body.transferId : null;
    if (!transferId) return jsonError(400, "transferId is required");

    const supabase = await createSupabaseServerClient();
    const transfer = await getTransfer(supabase, session.userId, transferId);
    if (!transfer) return jsonError(404, "Unknown transfer");
    if (!transfer.session_uri_encrypted) {
      return NextResponse.json({ bytesTransferred: transfer.bytes_transferred, complete: false });
    }

    const totalSize = Number(transfer.size) || 0;
    const token = await driveToken(session.userId);
    const received = await queryUploadStatus({
      sessionUri: decryptSecret(transfer.session_uri_encrypted),
      accessToken: token,
    });

    if (received >= totalSize) {
      await updateTransfer(supabase, session.userId, transferId, {
        status: "completed",
        bytesTransferred: totalSize,
        completedAt: new Date().toISOString(),
      } as never);
      return NextResponse.json({ bytesTransferred: totalSize, complete: true });
    }

    await updateTransfer(supabase, session.userId, transferId, {
      status: "paused",
      bytesTransferred: received,
    } as never);

    return NextResponse.json({ bytesTransferred: received, complete: false });
  } catch (error) {
    return handleError(error);
  }
}