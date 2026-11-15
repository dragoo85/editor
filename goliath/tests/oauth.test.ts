import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/google/oauth/callback";
  process.env.GOLIATH_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
});

function fakeIdToken(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(payload)}.signature`;
}

describe("google oauth helpers", () => {
  it("builds a PKCE consent URL with the requested scope", async () => {
    const { buildConsentUrl, REQUIRED_SCOPES } = await import("../src/lib/google/oauth");
    const url = new URL(
      buildConsentUrl({
        scopes: [...REQUIRED_SCOPES, "https://www.googleapis.com/auth/drive"],
        state: "state-123",
        codeChallenge: "challenge-abc",
        loginHint: "user@example.com",
      }),
    );
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/google/oauth/callback",
    );
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toContain("https://www.googleapis.com/auth/drive");
  });

  it("parses scopes and checks membership", async () => {
    const { parseScopes, hasScope } = await import("../src/lib/google/oauth");
    const scopes = parseScopes("openid email https://www.googleapis.com/auth/drive");
    expect(scopes).toHaveLength(3);
    expect(hasScope(scopes, "email")).toBe(true);
    expect(hasScope(scopes, "profile")).toBe(false);
    expect(parseScopes(undefined)).toEqual([]);
  });

  it("decodes an id token payload", async () => {
    const { decodeIdTokenPayload, decodeIdTokenEmail } = await import("../src/lib/google/oauth");
    const token = fakeIdToken({ email: "person@example.com", sub: "google-sub-1" });
    expect(decodeIdTokenEmail(token)).toBe("person@example.com");
    expect(decodeIdTokenPayload(token)?.sub).toBe("google-sub-1");
    expect(decodeIdTokenPayload("not-a-jwt")).toBeNull();
  });

  it("creates PKCE pairs with a 43-char base64url challenge", async () => {
    const { createPkcePair, createOAuthState } = await import("../src/lib/google/oauth");
    const pair = createPkcePair();
    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createOAuthState()).not.toBe(createOAuthState());
  });
});