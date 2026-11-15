# GOLIATH — development status

Last updated: 2026-11-15 · Branch: session workspace · Runtime verified with Node 24 / npm 11

## Verified in this environment

| Check                    | Result                                                     |
| ------------------------ | ---------------------------------------------------------- |
| `npx tsc --noEmit`       | PASS (0 errors)                                            |
| `npx next build`         | PASS (all routes compiled, middleware 95.3 kB)             |
| `npx vitest run`         | PASS (5 files, 24 tests)                                   |
| Dependency install       | PASS (Next 15.5.29, React 19.1.10, Tailwind 3.4.19)        |
| Dev-server smoke test    | PASS — `/api/health` 200, `/login` 200, `/onboarding` 200; unauthenticated `/dashboard` and `/files` → 307 `/login`; `/api/drive/*` and `/api/google/*` → 401/503 with a real error body instead of a crash |

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