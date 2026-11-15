# Security model

## Secrets

| Secret                         | Where it lives                     | Exposed to browser? |
| ------------------------------ | ---------------------------------- | ------------------- |
| `GOOGLE_CLIENT_SECRET`         | server env only                    | never               |
| Google refresh token           | Postgres, AES-256-GCM ciphertext   | never               |
| Google access token            | Postgres, AES-256-GCM ciphertext   | never               |
| Resumable upload session URI   | Postgres, AES-256-GCM ciphertext   | never               |
| `GOLIATH_TOKEN_ENCRYPTION_KEY` | server env only                    | never               |
| `SUPABASE_SERVICE_ROLE_KEY`    | server env only                    | never               |
| Supabase anon key              | `NEXT_PUBLIC_*`                    | yes (by design)     |

Encryption format: `v1:<iv>:<tag>:<ciphertext>` with a random 12-byte IV per record and a 16-byte
GCM auth tag. A SHA-256-derived key is used when the configured value is not exactly 32 bytes, so a
passphrase still works — generate a real 32-byte key in production.

## OAuth hardening

- Authorization-code flow with **PKCE (S256)**; the verifier lives in an HttpOnly, SameSite=Lax,
  10-minute cookie and is compared in constant time with the returned `state`.
- `access_type=offline` + `prompt=consent` so a refresh token is always issued.
- Refresh tokens rotate: a new refresh token replaces the old one when Google returns one.
- `disconnect` revokes the token at Google before deleting the row and cached metadata.
- Cookies are `Secure` in production.

## Authorization

- Every table has RLS with `auth.uid() = user_id` (or an ownership subquery for `ai_messages`).
- API routes call `requireSession()` and scope every query by `session.userId`.
- Route handlers never trust a client-supplied user id.
- The browser SDK only ever receives the anon key; privileged reads happen in server code.

## Input validation

Every POST/PUT body is parsed through `lib/validation.ts`: required strings with length bounds,
drive-id regex `^[a-zA-Z0-9_-]{1,256}$`, numeric ranges for sizes/chunk indexes, boolean coercion.
Invalid input returns `400` with a field-level message. Upload chunks are rejected when they exceed
the declared file size.

## Rate limiting

`lib/rate-limit.ts` implements a token bucket per key. AI endpoints allow 20 requests/minute per
user and return `429` with `retryAfterSeconds`. For multi-instance deployments swap the in-memory map
for Redis/Upstash.

## Agent safety

- Read-only by default.
- Mutating actions require a second, explicit HTTP call with a stored `actionId`.
- Pending actions expire logically by status; a confirmed action can only run once.
- All actions are logged with status and result.
- The agent has no tool that reads files outside the user's Drive.

## Error handling

- Errors returned to clients are sanitised: unknown 500s become `"Internal server error"` and the
  real error is logged server-side.
- Drive errors keep Google's message for actionable UI copy but never leak credentials.

## Known limitations (documented, not hidden)

- The rate limiter is per-process.
- Web downloads buffer the file in memory before saving; very large downloads should use the desktop
  client (streams to disk) or Drive directly.
- Uploads resume only within a session that still holds the `File` object.
- `GOLIATH_DRIVE_SCOPE=https://www.googleapis.com/auth/drive` grants write access to everything the
  user can reach; narrow it to `drive.file` if that trade-off is unacceptable.