# Setup

## 1. Supabase

1. Create a project at <https://supabase.com/dashboard>.
2. **SQL editor** → run `goliath/supabase/migrations/0001_init.sql`.
   This creates every table, all RLS policies, the profile trigger and the indexes.
3. **Project Settings → API** → copy the project URL and the `anon` key.
4. **Authentication → Providers → Email** is enabled by default. Confirm that
   "Confirm email" matches your preference; the login page handles either case.
5. Copy the `service_role` key for server-only use.

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

## 2. Google Cloud

1. Create/select a project in <https://console.cloud.google.com>.
2. **APIs & Services → Library → Google Drive API → Enable**.
3. **APIs & Services → OAuth consent screen** → External → add your email as a test user
   (or publish the app). Scopes are added at runtime, no need to register them here.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorised redirect URI: `http://localhost:3000/api/google/oauth/callback`.
5. Copy the client ID and secret.

`.env.local` additions:

```
GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback
GOLIATH_DRIVE_SCOPE=https://www.googleapis.com/auth/drive
```

### About scopes

| Scope                                  | Effect                                                    |
| -------------------------------------- | --------------------------------------------------------- |
| `drive.file`                           | Only files the app created. **Not enough** to browse existing Drive content. |
| `drive.readonly`                       | Read everything, but uploads/rename/delete fail.           |
| `drive` (default)                      | Full management, required by the upload/rename/move/copy/trash feature set. |
| `drive.metadata.readonly`              | Metadata only; cannot read contents or write.              |

GOLIATH requests `openid email profile` + the scope in `GOLIATH_DRIVE_SCOPE`. Set it to
`drive.file` if you only ever want GOLIATH to see its own folder — listing and search will then be
limited to files GOLIATH created.

## 3. Token encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the value to `.env.local` as `GOLIATH_TOKEN_ENCRYPTION_KEY`. Losing it means every stored
refresh token becomes undecryptable and you must reconnect each account.

## 4. AI (optional)

**Gemini** — get a key from <https://aistudio.google.com/apikey>:

```
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-flash
```

A Google AI Pro subscription does **not** include Gemini Developer API quota. If you do not want a
separate API key, leave this empty.

**Local models (Ollama)** — <https://ollama.com>:

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

`auto` prefers Gemini, then Ollama, and reports `disabled` when neither is present.

## 5. Run

```bash
cd goliath
npm install
npm run dev
```

Open <http://localhost:3000>, create an account, then go to **Account** and press
**Connect Google Drive**. You will be redirected to Google; after consent you land back on the
dashboard and the GOLIATH folder is created inside your Drive on first use.

## 6. Troubleshooting

| Symptom                                    | Cause / fix                                                        |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `redirect_uri_mismatch`                    | The URI in Google Cloud must match `GOOGLE_REDIRECT_URI` exactly.  |
| `invalid_state`                            | OAuth cookies were cleared or > 10 min old. Re-authorise.           |
| `Google Drive is not connected`            | OAuth completed without a refresh token (revoke and reconnect).     |
| `Missing required environment variable …`  | Add it to `goliath/.env.local` and restart `npm run dev`.           |
| Upload fails with 403                      | Scope lacks write access — set `GOLIATH_DRIVE_SCOPE` to `drive`.    |
| AI returns `503 ai_not_configured`         | Add `GEMINI_API_KEY` or start Ollama.                               |