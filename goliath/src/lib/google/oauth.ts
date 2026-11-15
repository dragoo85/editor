import { newState, newVerifier, sha256Base64Url } from "../crypto";
import { env } from "../env";

/**
 * Google OAuth 2.0 authorization-code flow with PKCE (S256) and state binding.
 * The refresh token is never returned to the browser.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export const REQUIRED_SCOPES = ["openid", "email", "profile"] as const;

export interface GoogleTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface ConsentUrlInput {
  scopes: string[];
  state: string;
  codeChallenge: string;
  loginHint?: string;
}

export function buildConsentUrl({ scopes, state, codeChallenge, loginHint }: ConsentUrlInput): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", env.googleClientId());
  url.searchParams.set("redirect_uri", env.googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url.toString();
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<GoogleTokenSet> {
  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId(),
    client_secret: env.googleClientSecret(),
    redirect_uri: env.googleRedirectUri(),
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${detail.slice(0, 400)}`);
  }
  return (await response.json()) as GoogleTokenSet;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenSet> {
  const body = new URLSearchParams({
    client_id: env.googleClientId(),
    client_secret: env.googleClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google token refresh failed (${response.status}): ${detail.slice(0, 400)}`);
  }
  return (await response.json()) as GoogleTokenSet;
}

export async function revokeToken(token: string): Promise<void> {
  const body = new URLSearchParams({ token });
  await fetch(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  }).catch(() => undefined);
}

export function parseScopes(scope: string | undefined): string[] {
  if (!scope) return [];
  return scope.split(/\s+/).filter(Boolean);
}

export function hasScope(scopes: string[], scope: string): boolean {
  return scopes.includes(scope);
}

/** Verifier/challenge pair for PKCE; the verifier stays server-side in a signed cookie. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = newVerifier();
  return { verifier, challenge: sha256Base64Url(verifier) };
}

export function createOAuthState(): string {
  return newState();
}

export function decodeIdTokenEmail(idToken: string | undefined): string | null {
  return decodeIdTokenPayload(idToken)?.email ?? null;
}

export function decodeIdTokenPayload(
  idToken: string | undefined,
): { email?: string; sub?: string; name?: string } | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      email?: string;
      sub?: string;
      name?: string;
    };
  } catch {
    return null;
  }
}