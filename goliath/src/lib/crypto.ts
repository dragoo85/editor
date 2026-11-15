import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { env } from "./env";

/**
 * AES-256-GCM encryption for OAuth refresh tokens and resumable session URIs.
 * Ciphertext format: v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 */

const PREFIX = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer {
  const raw = env.tokenEncryptionKey();
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    // Allow a raw passphrase by deriving a 32-byte key with SHA-256.
    return createHash("sha256").update(raw).digest();
  }
  return buf;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(
    ":",
  );
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Malformed encrypted secret payload");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function newState(): string {
  return randomUUID().replace(/-/g, "") + randomBytes(8).toString("hex");
}

export function newVerifier(): string {
  return randomBytes(48).toString("base64url");
}

export function newUploadId(): string {
  return randomUUID();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** PKCE S256 challenges must be the base64url encoding of the SHA-256 digest. */
export function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}