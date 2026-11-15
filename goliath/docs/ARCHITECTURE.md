# Architecture

## Layers

```
Browser / Tauri / Expo
        │  (cookie session or Bearer access token)
        ▼
Next.js App Router ── middleware (session refresh + route guard)
        │
        ├── API routes (src/app/api/**)  ── validation, rate limiting, RLS-scoped Supabase
        │        │
        │        ├── lib/google/oauth.ts   OAuth + PKCE + refresh
        │        ├── lib/google/drive.ts   Drive REST v3 (no SDK)
        │        ├── lib/db/repositories   tables + RLS
        │        └── lib/ai/*              provider adapters + agent policy
        │
        └── Supabase Postgres (metadata only, RLS)
```

## Why no Drive SDK

`googleapis` pulls a large dependency tree for endpoints GOLIATH actually uses. `lib/google/drive.ts`
implements the v3 surface with `fetch`, which keeps the audit surface small and lets upload chunks
flow through the same request path as metadata calls.

## Storage model

Drive is the source of truth for bytes. PostgreSQL stores **metadata and state only**:

| Table                 | Holds                                                        |
| --------------------- | ------------------------------------------------------------ |
| `google_accounts`     | encrypted refresh/access tokens, scopes, root folder id      |
| `files` / `folders`   | name, mime, size, parents, timestamps, starred, trashed      |
| `transfers`           | transfer state + encrypted resumable session URI             |
| `favorites`           | starred file ids                                             |
| `ai_conversations`, `ai_messages` | chat history                                 |
| `agent_action_logs`   | every agent action, pending → executed/denied/failed         |
| `settings`            | per-user UI + AI preferences                                 |

No `bytea`/base64 column exists anywhere. A file's content never enters Postgres.

## Resumable upload

```
client                         server                                  Drive
  │  POST /upload/init  ───────▶ createResumableSession ──────────────▶ POST upload/drive/v3/files?uploadType=resumable
  │  ◀── {transferId, chunkSize} (session URI encrypted + stored)
  │  PUT /upload/chunk  ───────▶ decrypt session URI ─────────────────▶ PUT sessionUri (X-Goog-Upload-Offset)
  │  ◀── {bytesReceived}          (progress persisted per chunk)
  │  … repeat, final chunk with "upload, finalize" ──────────────────▶ 200/201 + file id
  │  ◀── {status: completed, fileId}
```

`POST /upload/status` asks Drive how many bytes it already holds, so an interrupted upload can resume
from the server's offset within the same session (the browser must still hold the `File` handle;
after a full page reload the transfer is marked failed and can be restarted).

## AI agent policy

1. The model is told it is read-only by default and must emit a `goliath-action` block for operations.
2. Read-only actions (`search`, `read_metadata`, `read_text`, `summarize`) execute immediately and
   are logged.
3. Mutating actions (`rename`, `move`, `copy`, `trash`, `star`) are written to `agent_action_logs`
   with `status = 'pending'` and **never executed** by the model.
4. `POST /api/ai/confirm` is the only path that performs the mutation, after an explicit user click.
5. Every executed action writes a log row with the result payload.

## Performance choices

- Drive listings request only the fields the UI renders (`fields=` projection).
- Thumbnails are lazy `<img>` tags pointing at the authenticated download route.
- Metadata is written once per folder page (`replaceFolderSnapshot` upsert), not per file request.
- Chunk size is 5 MB (configurable) — large enough to amortise round trips, small enough to retry.
- Concurrency is capped at 2 uploads / 3 downloads to avoid Drive 403 rate-limit responses.
- Route handlers that touch Drive are `force-dynamic`; static pages stay static.

## Adding a Drive capability

1. Add a typed function to `lib/google/drive.ts`.
2. Add a thin route under `src/app/api/drive/**` with `requireSession()` + a validator.
3. Call it from the UI through `lib/client/api.ts`.

## Adding an AI tool

1. Add the action to `AgentActionSpec` and `MUTATING_ACTIONS` if it writes.
2. Implement it in `lib/ai/tools.ts` (return a `ToolResult`).
3. Document the action in `lib/ai/prompts.ts` so the model knows it exists.