import { NextResponse, type NextRequest } from "next/server";
import { env, isGoogleConfigured } from "@/lib/env";
import { createOAuthState, createPkcePair, buildConsentUrl, REQUIRED_SCOPES } from "@/lib/google/oauth";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "goliath_oauth_state";
const VERIFIER_COOKIE = "goliath_oauth_verifier";
const COOKIE_MAX_AGE = 600;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 503 },
    );
  }

  const { verifier, challenge } = createPkcePair();
  const state = createOAuthState();
  const scopes = [...REQUIRED_SCOPES, env.googleDriveScope()];

  const consentUrl = buildConsentUrl({
    scopes,
    state,
    codeChallenge: challenge,
    loginHint: user.email ?? undefined,
  });

  const response = NextResponse.redirect(consentUrl);
  response.cookies.set(STATE_COOKIE, state, cookieOptions());
  response.cookies.set(VERIFIER_COOKIE, verifier, cookieOptions());
  return response;
}