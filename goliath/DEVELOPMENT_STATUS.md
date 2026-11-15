# GOLIATH — development status

Last updated: 2026-11-15 · Branch: session workspace · Runtime verified with Node 24 / npm 11

## Verified in this environment

| Check                    | Result                                                     |
| ------------------------ | ---------------------------------------------------------- |
| `npm run typecheck`      | PASS (0 errors)                                            |
| `npm run build`          | PASS (all routes compiled, middleware 65.9 kB)             |
| `npm run test`           | PASS (7 files, 43 tests)                                   |
| `npm run verify:sql`     | PASS (74 statements parsed with the real PostgreSQL grammar) |
| Dev-server smoke test    | PASS — `/api/health` 200, `/login` 200, `/onboarding` 200; unauthenticated `/dashboard` and `/files` → 307 `/login`; `/api/drive/*` and `/api/google/*` → 401/503 with a real error body instead of a crash |
| `npm run env:generate`   | PASS — writes `.env.local` with a real 32-byte encryption key and blanks for account credentials |
| `npm run env:check`      | PASS — reports exactly which account credentials are still missing |

### What is verified by the test suite

- **Drive wire protocol** (`tests/drive.protocol.test.ts`, 11 tests) against a fake Drive that
  implements Google's real semantics: resumable session creation, `308` + `Range` chunk progress,
  offset validation, finalising chunk, resume after a transient `503` with no committed bytes,
  folder-marker root creation, pagination, full-text search, rename/move/copy/star/trash, quota,
  ranged download, and `DriveError` status mapping.
- **OAuth helpers**: PKCE S256 challenge format, consent URL parameters, scope parsing, id-token decoding.
- **Token encryption**: round-trip, ciphertext uniqueness, tamper rejection, passphrase derivation.
- **API contracts** (`tests/api.contract.test.ts`, 8 tests): unknown action → 400, missing
  confirmation → 400, unsafe drive id → 400, unauthenticated → 401, missing message → 400,
  unconfigured AI → `503 ai_not_configured`.
- **Transfer math, validators, rate limiter.**

### Bugs found and fixed while verifying

| Bug                                                        | Fix                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| Validation failures returned `500` instead of `400`        | `handleError` now maps `ValidationError` → 400              |
| PKCE challenge was hex SHA-256 (Google expects base64url)  | `sha256Base64Url` used for the challenge                    |
| `sort=modifiedTime` referenced a camelCase column          | Sort keys mapped to snake_case columns                      |
| Zero-byte uploads could never finalise                     | Empty finalising chunk allowed when the file is empty       |
| Unconfigured deployment crashed `/dashboard`               | `getSessionUser` returns null; API returns `503 not_configured` |

## What was automated for you (no action needed)

- `goliath/.env.local` generated with a real `GOLIATH_TOKEN_ENCRYPTION_KEY` (chmod 600, gitignored).
- `scripts/generate-env.mjs` regenerates local secrets; `scripts/check-env.mjs` reports what is missing.
- `scripts/validate-sql.mjs` parses every migration with the PostgreSQL grammar (`libpg-query`).
- `npm run verify` = typecheck + tests + SQL validation.
- Drive endpoint overrides (`GOLIATH_DRIVE_API_BASE`, `GOLIATH_DRIVE_UPLOAD_BASE`) enable the
  protocol tests and any proxy deployment.

## Remaining blockers (require your accounts only)

| Blocker                          | Why it cannot be automated here                                  |
| -------------------------------- | ---------------------------------------------------------------- |
| Supabase project + schema apply  | Needs your Supabase account; no Docker/Postgres in this sandbox  |
| Google OAuth client              | Needs your Google Cloud project and consent screen               |
| Real upload/download round-trip  | Needs a connected Drive account                                  |
| Gemini / Ollama inference        | Needs an API key or a running local model                        |
| `cargo build` / `tauri build`    | No Rust toolchain in the container                               |
| `expo start` on a device         | Expo packages declared but not installed in this sandbox         |

Unconfigured deployments degrade explicitly: pages redirect to `/login`, API routes return
`503 {"code":"not_configured"}` rather than throwing, and the UI shows which env vars are missing.

## Implemented (real, not mocked)

### Web app (`goliath/src`)
- **Auth**: Supabase Auth (email + password, sign-up/sign-in), middleware route protection,
  cookie session refresh, optional `Authorization: Bearer` for desktop/mobile.
- **Google OAuth 2.0**: authorization-code + PKCE (S256) + state cookie, offline access,
  `access_type=offline&prompt=consent`, refresh-token rotation persisted **encrypted**
  (AES-256-GCM), revoke on disconnect, id-token parsing for account email.
- **Drive integration** (`lib/google/drive.ts`, pure REST v3): GOLIATH root folder with an
  `appProperties` marker, listing, search (fullText), metadata, rename, move, copy, trash, star,
  storage quota, resumable session start/status/chunk/finalize/cancel, streamed download with Range.
- **Transfer engine** (client): queued uploads with 5 MB chunks, per-chunk retry with exponential
  backoff + jitter, pause/cancel/retry, concurrent upload (2) and download (3) limits, live progress,
  persisted history in `transfers`.
- **Download manager**: streams `alt=media` through an authenticated API route, writes a Blob and
  triggers a save; supports HTTP Range.
- **Database** (`supabase/migrations/0001_init.sql`): profiles, google_accounts, folders, files,
  transfers, favorites, ai_conversations, ai_messages, agent_action_logs, settings — all with RLS
  policies scoped to `auth.uid()`, indexes, and `updated_at` triggers. **No file contents stored.**
- **AI**: provider-independent interface (`lib/ai/types.ts`) with Gemini and Ollama adapters, a
  system prompt that mandates read-only behaviour, an action-block protocol, read-only tools
  (search, metadata, read text, summarise incl. PDF via Gemini inline data), confirmation gate for
  mutations, and an append-only agent action log.
- **Pages**: login, onboarding, dashboard, file manager (grid/list, breadcrumb, drag-and-drop,
  multi-select, context menu, preview, rename/delete/new-folder dialogs, sort, pagination),
  recent, starred, upload manager, download manager, AI workspace, search, settings, account.
- **Security**: env validation with actionable errors, AES-256-GCM token encryption, PKCE state
  binding, per-user rate limiting on AI endpoints, input validators for every route body, RLS,
  `.env.example` + `.gitignore` (no secrets committed).

### Desktop (`goliath/tauri`)
- Tauri v2 project (`src-tauri/Cargo.toml`, `tauri.conf.json`, `main.rs`) that opens the Next.js
  workspace in a native window, honours `GOLIATH_APP_URL`, and includes a CSP and Windows bundle
  targets.

### Mobile (`goliath/mobile`)
- Expo SDK 58 + expo-router app: Supabase session in `expo-secure-store`, Bearer-token API client,
  file browsing with folder navigation, chunked upload via `expo-document-picker`, account/storage
  screen, dark graphite theme.

## Not verified here (needs credentials or tooling)

| Item                              | Why it is unverified                                          |
| --------------------------------- | ------------------------------------------------------------ |
| Live Google OAuth round-trip      | Needs a real Google Cloud OAuth client and your consent       |
| Real upload/download to Drive     | Needs a connected account; code path is exercised by unit tests only for the math, not the network |
| Supabase schema application       | No Supabase project credentials in this sandbox                |
| `cargo build` / `tauri build`     | No Rust toolchain in the container                             |
| `expo start` / device run         | Expo packages are declared but not installed in this sandbox   |
| Gemini / Ollama inference         | Needs an API key or a running Ollama                           |

None of these are mocked or faked. Until you provide credentials, the UI shows explicit
"not connected / not configured" states and every API route returns a real error.

## Next steps for the operator

1. Create the Supabase project, apply `0001_init.sql`, and fill `.env.local`.
2. Create a Google Cloud OAuth client (Web), enable the Drive API, add the redirect URI
   `http://localhost:3000/api/google/oauth/callback`.
3. Run `npm run dev`, sign in, connect Drive, upload a file, download it, run one AI query.
4. Generate `GOLIATH_TOKEN_ENCRYPTION_KEY` with
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
5. For desktop: install Rust + Tauri CLI, then `cd tauri && npm install && npm run dev`.
6. For mobile: `cd mobile && npm install && npx expo start` with `EXPO_PUBLIC_API_URL` set to your
   machine's LAN IP (Android emulator: `http://10.0.2.2:3000`).