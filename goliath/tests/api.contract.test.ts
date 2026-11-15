/**
 * Route-level contract tests. Supabase and Drive are replaced with test
 * doubles, so these exercise the real validation, auth guard and provider
 * resolution paths without any external account.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// requireSession() short-circuits when Supabase is unconfigured; pretend it is
// configured so the contract under test is reached.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

const state = vi.hoisted(() => ({
  userId: "11111111-1111-4111-8111-111111111111" as string | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSessionUser: vi.fn(async () =>
    state.userId ? { id: state.userId, email: "user@example.com" } : null,
  ),
  createSupabaseServerClient: vi.fn(() => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  })),
}));

vi.mock("@/lib/drive-service", () => ({
  driveToken: vi.fn(async () => "test-access-token"),
  rootFolderId: vi.fn(async () => "root-folder-id"),
  listFolder: vi.fn(),
  search: vi.fn(),
  usage: vi.fn(),
}));

vi.mock("@/lib/google/account", () => ({
  getAccountStatus: vi.fn(async () => ({
    connected: true,
    email: "user@example.com",
    scopes: ["openid", "email"],
    driveRootId: "root-folder-id",
    lastSyncedAt: null,
    configured: true,
  })),
}));

vi.mock("@/lib/ai", () => ({
  resolveProvider: vi.fn(() => null),
  providerDescription: vi.fn(() => ({ name: "disabled", available: false, model: "" })),
}));

function post(path: string, body: unknown): Promise<Response> {
  return import("@/app/api/drive/mutate/route").then(async (module) => {
    const response = await module.POST(
      new Request(`http://localhost${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    return response as unknown as Response;
  });
}

describe("POST /api/drive/mutate", () => {
  beforeEach(() => {
    state.userId = "11111111-1111-4111-8111-111111111111";
  });

  it("rejects an unknown action", async () => {
    const response = await post("/api/drive/mutate", { action: "explode", fileId: "abc" });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toMatch(/unsupported action/i);
  });

  it("requires confirmation before trashing", async () => {
    const response = await post("/api/drive/mutate", { action: "trash", fileId: "abc123" });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toMatch(/confirmation/i);
  });

  it("requires a name to rename", async () => {
    const response = await post("/api/drive/mutate", { action: "rename", fileId: "abc123" });
    expect(response.status).toBe(400);
  });

  it("rejects an unsafe drive id", async () => {
    const response = await post("/api/drive/mutate", {
      action: "rename",
      fileId: "../../etc/passwd",
      name: "x",
    });
    expect(response.status).toBe(400);
  });

  it("returns 401 when there is no session", async () => {
    state.userId = null;
    const response = await post("/api/drive/mutate", { action: "trash", fileId: "abc", confirmed: true });
    expect(response.status).toBe(401);
  });
});

describe("POST /api/ai", () => {
  it("returns 503 with a machine-readable code when no provider is configured", async () => {
    state.userId = "11111111-1111-4111-8111-111111111111";
    const { POST } = await import("@/app/api/ai/route");
    const response = (await POST(
      new Request("http://localhost/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      }),
    )) as unknown as Response;

    expect(response.status).toBe(503);
    const payload = (await response.json()) as { code?: string };
    expect(payload.code).toBe("ai_not_configured");
  });

  it("rejects an empty message", async () => {
    const { POST } = await import("@/app/api/ai/route");
    const response = (await POST(
      new Request("http://localhost/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" }),
      }),
    )) as unknown as Response;

    expect(response.status).toBe(400);
  });

  it("returns 401 when there is no session", async () => {
    state.userId = null;
    const { POST } = await import("@/app/api/ai/route");
    const response = (await POST(
      new Request("http://localhost/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      }),
    )) as unknown as Response;

    expect(response.status).toBe(401);
  });
});