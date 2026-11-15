# GOLIATH

A premium cloud-storage workspace that runs **on your own Google Drive**. GOLIATH adds a real file
manager, resumable transfer engine, metadata sync, an AI document workspace and a confirmation-gated
agent on top of Drive — it never stores file contents in PostgreSQL and never fakes an upload.

```
goliath/
├── src/                 Next.js 15 (App Router, TypeScript, Tailwind)
│   ├── app/             pages + API routes
│   ├── components/      UI shell, file browser, transfers, toasts
│   └── lib/             drive client, OAuth, crypto, AI, db repositories
├── supabase/migrations   schema + Row Level Security
├── tauri/               Windows desktop shell (Tauri v2)
├── mobile/              Expo / React Native client
├── tests/               vitest unit tests
└── docs/                setup, architecture, security, deployment
```

> This repository also contains an unrelated app at the workspace root (`lumina-photo-studio`).
> GOLIATH lives entirely in `goliath/` and does not touch those files.

## Quick start

```bash
cd goliath
npm install
cp .env.example .env.local      # fill in Supabase + Google OAuth
npm run dev                     # http://localhost:3000
```

Apply the database schema (Supabase SQL editor or CLI):

```bash
supabase db push                # or paste supabase/migrations/0001_init.sql into the SQL editor
```

Then sign in at `/login`, open `/account` and connect Google Drive.

## Scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Next.js dev server                       |
| `npm run build`     | Production build                         |
| `npm start`         | Serve the production build               |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm test`          | vitest (unit + Drive protocol + API contracts) |
| `npm run verify:sql`| Parse migrations with the PostgreSQL grammar |
| `npm run verify`    | typecheck + tests + SQL validation       |
| `npm run env:generate` | Write `.env.local` with generated local secrets |
| `npm run env:check` | Report which credentials are still missing |

## First run

```bash
cd goliath
npm install
node scripts/generate-env.mjs     # real encryption key, blanks for account creds
node scripts/check-env.mjs        # tells you exactly what is missing
npm run dev
```

## Required environment

| Variable                     | Required | Notes                                                        |
| ---------------------------- | -------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`   | yes      | Project URL                                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes   | Public anon key                                              |
| `SUPABASE_SERVICE_ROLE_KEY`  | server   | Only used in server code (never bundled)                     |
| `GOLIATH_TOKEN_ENCRYPTION_KEY` | yes    | 32 bytes, base64. Encrypts refresh tokens                    |
| `GOOGLE_CLIENT_ID`           | yes      | OAuth client (Web application)                               |
| `GOOGLE_CLIENT_SECRET`       | yes      | Server-side only                                             |
| `GOOGLE_REDIRECT_URI`        | yes      | `http://localhost:3000/api/google/oauth/callback`            |
| `GOLIATH_DRIVE_SCOPE`        | no       | Defaults to `.../auth/drive` (full management)               |
| `GEMINI_API_KEY`             | no       | Enables Gemini for AI features                               |
| `OLLAMA_BASE_URL`            | no       | Enables local models                                         |

See [docs/SETUP.md](docs/SETUP.md) for the full walkthrough.

## Feature map

| Area            | Where                                                      |
| --------------- | ---------------------------------------------------------- |
| Google OAuth    | `src/app/api/google/oauth/{start,callback}`                |
| Drive REST      | `src/lib/google/drive.ts`                                  |
| Resumable upload| `src/app/api/drive/upload/{init,chunk,status,cancel}`      |
| Download stream | `src/app/api/drive/download`                               |
| Metadata sync   | `src/lib/db/repositories.ts` + `files` table               |
| AI chat         | `src/app/api/ai`, `src/lib/ai/*`                           |
| Agent policy    | `src/lib/ai/agent.ts` (read-only default, confirmation gate)|
| UI              | `src/components/{files,transfers,shell,ui}`                |
| Desktop         | `tauri/`                                                   |
| Mobile          | `mobile/`                                                  |

## Status

`DEVELOPMENT_STATUS.md` records what is implemented, what is verified, and what still needs
credentials or a build environment. Read it before assuming a feature is finished.