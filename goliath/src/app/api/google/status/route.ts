import { NextResponse } from "next/server";
import { getAccountStatus } from "@/lib/google/account";
import { requireSession } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const status = await getAccountStatus(session.userId);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}