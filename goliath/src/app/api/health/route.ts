import { NextResponse } from "next/server";
import { activeAiProvider, isGoogleConfigured, isSupabaseConfigured, env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "goliath",
    time: new Date().toISOString(),
    integrations: {
      supabase: isSupabaseConfigured(),
      googleDrive: isGoogleConfigured(),
      ai: activeAiProvider(),
      aiModels: {
        gemini: env.geminiModel(),
        ollama: env.ollamaModel(),
      },
    },
  });
}