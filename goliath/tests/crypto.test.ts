import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

beforeAll(() => {
  process.env.GOLIATH_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("secret encryption", () => {
  it("round-trips a refresh token", async () => {
    const { encryptSecret, decryptSecret } = await import("../src/lib/crypto");
    const secret = "1//0g-refresh-token-value";
    const encrypted = encryptSecret(secret);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("produces different ciphertext for the same plaintext", async () => {
    const { encryptSecret } = await import("../src/lib/crypto");
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
  });

  it("rejects tampered payloads", async () => {
    const { encryptSecret, decryptSecret } = await import("../src/lib/crypto");
    const encrypted = encryptSecret("payload");
    const [prefix, iv, tag, data] = encrypted.split(":");
    const tampered = [prefix, iv, tag, Buffer.from("tampered").toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
    expect(() => decryptSecret(`${prefix}:${iv}:${tag}`)).toThrow();
    expect(data.length).toBeGreaterThan(0);
  });

  it("supports passphrase-derived keys", async () => {
    process.env.GOLIATH_TOKEN_ENCRYPTION_KEY = "a-plain-passphrase";
    const { encryptSecret, decryptSecret } = await import("../src/lib/crypto");
    const encrypted = encryptSecret("derived");
    expect(decryptSecret(encrypted)).toBe("derived");
    process.env.GOLIATH_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });
});