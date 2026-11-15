import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { storeConnectedAccount } from "@/lib/google/account";
import { decodeIdTokenPayload, exchangeCode } from "@/lib/google/oauth";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "goliath_oauth_state";
const VERIFIER_COOKIE = "goliath_oauth_verifier";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const appUrl = new URL("/dashboard", request.url);

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    appUrl.searchParams.set("error", oauthError);
    return NextResponse.redirect(appUrl);
  }

  if (!code || !state) {
    appUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(appUrl);
  }

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;

  if (!expectedState || !verifier || !safeEqual(expectedState, state)) {
    appUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(appUrl);
  }

  try {
    const tokens = await exchangeCode(code, verifier);
    const payload = decodeIdTokenPayload(tokens.id_token);

    await storeConnectedAccount({
      userId: user.id,
      tokens,
      email: payload?.email ?? user.email ?? null,
      providerSub: payload?.sub ?? null,
    });

    const response = NextResponse.redirect(appUrl);
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[goliath] oauth callback failed", error);
    appUrl.searchParams.set("error", "oauth_failed");
    const response = NextResponse.redirect(appUrl);
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }
}