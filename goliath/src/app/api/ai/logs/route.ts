import { NextResponse } from "next/server";
import { handleError, requireSession } from "@/lib/api";
import { listAgentActions } from "@/lib/db/repositories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { providerDescription } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const supabase = await createSupabaseServerClient();
    const [logs, provider] = await Promise.all([
      listAgentActions(supabase, session.userId, 50),
      Promise.resolve(providerDescription()),
    ]);
    return NextResponse.json({ logs, provider });
  } catch (error) {
    return handleError(error);
  }
}