import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { disconnectAccount } from "@/lib/google/account";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    await disconnectAccount(session.userId);
    return NextResponse.json({ connected: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect" },
      { status: 500 },
    );
  }
}