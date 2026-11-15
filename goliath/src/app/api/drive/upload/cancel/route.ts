import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { getTransfer, updateTransfer } from "@/lib/db/repositories";
import { driveToken } from "@/lib/drive-service";
import { cancelResumableSession } from "@/lib/google/drive";
import { handleError, jsonError, readJson, requireSession } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

    if (transfer.session_uri_encrypted) {
      const token = await driveToken(session.userId);
      await cancelResumableSession(decryptSecret(transfer.session_uri_encrypted), token);
    }

    await updateTransfer(supabase, session.userId, transferId, {
      status: "canceled",
      session_uri_encrypted: null,
    } as never);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}